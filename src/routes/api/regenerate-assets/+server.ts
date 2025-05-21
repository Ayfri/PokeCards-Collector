import { json } from '@sveltejs/kit';
import { fetchAllCardsData } from '$scrapers/card_fetcher';
import { fetchJapCardsData } from '$scrapers/jap_cards_scraper';
import { uploadFile } from '$scrapers/upload';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { setAPIKey } from '$scrapers/api_utils';

export async function GET(event: RequestEvent): Promise<Response> {
	console.log('SvelteKit API endpoint /api/regenerate-assets called');

	if (!env) {
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

	// Ensure R2_BUCKET_NAME is treated as a string key for env
	const R2_BUCKET_NAME = env.R2_BUCKET_NAME as string;
	const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID as string;
	const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY as string;
	const R2_ENDPOINT = env.R2_ENDPOINT as string;

	if (!R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
		console.error('Missing R2 configuration environment variables.');
		return json(
			{ success: false, message: 'Missing R2 configuration in environment.' },
			{ status: 500 }
		);
	}

	try {
		console.log('Fetching English cards and prices...');
		const { allCards, allPrices } = await fetchAllCardsData();

		console.log('Fetching Japanese cards...');
		const japCards = await fetchJapCardsData();

		// The 'env' object for uploadFile needs to be the raw env from platform context
		const uploadContextEnv = env as Record<string, any>;


		console.log('Uploading English cards data (cards.json)...');
		await uploadFile(JSON.stringify(allCards), 'cards.json', { env: uploadContextEnv, contentType: 'application/json' });

		console.log('Uploading prices data (prices.json)...');
		await uploadFile(JSON.stringify(allPrices), 'prices.json', { env: uploadContextEnv, contentType: 'application/json' });

		console.log('Uploading Japanese cards data (jp-cards.json)...');
		await uploadFile(JSON.stringify(japCards), 'jp-cards.json', { env: uploadContextEnv, contentType: 'application/json' });

		console.log('Successfully regenerated and uploaded all card assets.');
		return json(
			{ success: true, message: 'All card assets regenerated and uploaded.' }
		);
	} catch (error: any) {
		console.error('Failed to regenerate assets in SvelteKit endpoint:', error);
		return json(
			{ success: false, message: 'Failed to regenerate assets.', error: error.message },
			{ status: 500 }
		);
	}
}
