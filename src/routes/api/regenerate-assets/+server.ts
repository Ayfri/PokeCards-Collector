import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getR2Env, getS3Client, uploadBufferToR2 } from '$lib/r2';
import { FetchClient } from '$scrapers/tcgdex/client';
import type { Language } from '$scrapers/tcgdex/mappers';
import { scrapeLanguage } from '$scrapers/tcgdex/scraper';
import type { RequestEvent } from './$types';

/**
 * Rebuilds the JSON assets mirrored on R2 straight from TCGdex. One language is one full pass over every
 * set and card, so a complete refresh is tens of thousands of subrequests - past a Worker's cap. Ask for
 * one language at a time (`?lang=ja`), or run `bun run scrapers scrape` locally for the whole dataset.
 */
const FILES: Record<Language, {cards: string; prices: string; sets: string}> = {
	en: {cards: 'cards-full.json', prices: 'prices.json', sets: 'sets-full.json'},
	ja: {cards: 'jp-cards-full.json', prices: 'jp-prices.json', sets: 'jp-sets-full.json'},
};

export async function GET(event: RequestEvent): Promise<Response> {
	const expectedToken = env.PCC_TOKEN;
	if (!expectedToken) {
		console.error('PCC_TOKEN is not set in the server environment.');
		return json({ success: false, message: 'Server security configuration error.' }, { status: 500 });
	}

	if (event.request.headers.get('PCC_TOKEN') !== expectedToken) {
		console.warn('Unauthorized attempt to regenerate assets. Invalid or missing PCC_TOKEN.');
		return json({ success: false, message: 'Unauthorized. Invalid or missing PCC_TOKEN.' }, { status: 401 });
	}

	const requestedLang = event.url.searchParams.get('lang');
	if (requestedLang && !(requestedLang in FILES)) {
		return json({ success: false, message: `Invalid 'lang' query parameter. Allowed values are ${Object.keys(FILES).join(', ')}.` }, { status: 400 });
	}
	const langs = (requestedLang ? [requestedLang] : Object.keys(FILES)) as Language[];

	try {
		const r2Env = getR2Env(env as Record<string, any>);
		const s3Client = getS3Client(r2Env);
		const client = new FetchClient();
		const written: string[] = [];

		for (const lang of langs) {
			const result = await scrapeLanguage(client, lang);
			const files = FILES[lang];

			for (const [objectName, content] of [[files.cards, result.cards], [files.prices, result.prices], [files.sets, result.sets]] as const) {
				await uploadBufferToR2({
					s3Client,
					bucketName: r2Env.bucketName,
					objectName,
					contentBuffer: Buffer.from(JSON.stringify(content), 'utf-8'),
					contentType: 'application/json',
				});
				written.push(objectName);
			}
		}

		return json({ success: true, message: `Regenerated ${written.join(', ')}.` });
	} catch (error) {
		console.error('Failed to regenerate assets:', error);
		return json({ success: false, message: 'Failed to regenerate assets.', error: (error as Error).message }, { status: 500 });
	}
}
