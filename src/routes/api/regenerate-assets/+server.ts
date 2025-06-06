import { json } from '@sveltejs/kit';
import { fetchAllCardsData } from '$scrapers/card_fetcher';
import { fetchJapCardsData } from '$scrapers/jap_cards_scraper';
import { getR2Env, getS3Client, uploadBufferToR2 } from '$lib/r2';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { setAPIKey } from '$scrapers/api_utils';

export async function GET(event: RequestEvent): Promise<Response> {
	console.log('SvelteKit API endpoint /api/regenerate-assets called');

	const platformEnv = env as Record<string, any>;
	const fileToUpdate = event.url.searchParams.get('file');

	if (!platformEnv) {
		console.error('Platform environment context not available.');
		return json(
			{ success: false, message: 'Server environment configuration error.' },
			{ status: 500 }
		);
	}

	const expectedToken = env.PCC_TOKEN;
	const providedToken = event.request.headers.get('PCC_TOKEN');

	if (!expectedToken) {
		console.error('PCC_TOKEN is not set in the server environment.');
		return json(
			{ success: false, message: 'Server security configuration error.' },
			{ status: 500 }
		);
	}

	if (!providedToken || providedToken !== expectedToken) {
		console.warn('Unauthorized attempt to regenerate assets. Invalid or missing PCC_TOKEN.');
		return json(
			{ success: false, message: 'Unauthorized. Invalid or missing PCC_TOKEN.' },
			{ status: 401 }
		);
	}

	console.log('PCC_TOKEN validated successfully.');

	setAPIKey(env.POKEMON_TCG_API_KEY);

	// R2 environment variables are now fetched by getR2Env
	try {
		const r2Env = getR2Env(platformEnv);
		const s3Client = getS3Client(r2Env);

		const shouldUpdateCards = !fileToUpdate || fileToUpdate === 'cards';
		const shouldUpdatePrices = !fileToUpdate || fileToUpdate === 'prices';
		const shouldUpdateJapCards = !fileToUpdate || fileToUpdate === 'jp-cards';

		if (fileToUpdate && !shouldUpdateCards && !shouldUpdatePrices && !shouldUpdateJapCards) {
			return json(
				{ success: false, message: "Invalid 'file' query parameter. Allowed values are 'cards', 'prices', 'jp-cards', or empty." },
				{ status: 400 }
			);
		}

		if (shouldUpdateCards || shouldUpdatePrices) {
			console.log('Fetching English cards and prices...');
			const { allCards, allPrices } = await fetchAllCardsData();

			if (shouldUpdateCards) {
				const allCardsBuffer = Buffer.from(JSON.stringify(allCards), 'utf-8');
				console.log('Uploading English cards data (cards-full.json)...');
				await uploadBufferToR2({
					s3Client,
					bucketName: r2Env.bucketName,
					objectName: 'cards-full.json',
					contentBuffer: allCardsBuffer,
					contentType: 'application/json'
				});
			}

			if (shouldUpdatePrices) {
				const allPricesBuffer = Buffer.from(JSON.stringify(allPrices), 'utf-8');
				console.log('Uploading prices data (prices.json)...');
				await uploadBufferToR2({
					s3Client,
					bucketName: r2Env.bucketName,
					objectName: 'prices.json',
					contentBuffer: allPricesBuffer,
					contentType: 'application/json'
				});
			}
		}

		if (shouldUpdateJapCards) {
			console.log('Fetching Japanese cards...');
			const japCards = await fetchJapCardsData();
			const japCardsBuffer = Buffer.from(JSON.stringify(japCards), 'utf-8');
			console.log('Uploading Japanese cards data (jp-cards-full.json)...');
			await uploadBufferToR2({
				s3Client,
				bucketName: r2Env.bucketName,
				objectName: 'jp-cards-full.json',
				contentBuffer: japCardsBuffer,
				contentType: 'application/json'
			});
		}

		console.log('Successfully regenerated and uploaded selected card assets.');
		return json(
			{ success: true, message: 'Selected card assets regenerated and uploaded.' }
		);
	} catch (error: any) {
		console.error('Failed to regenerate assets in SvelteKit endpoint:', error);
		return json(
			{ success: false, message: 'Failed to regenerate assets.', error: error.message },
			{ status: 500 }
		);
	}
}
