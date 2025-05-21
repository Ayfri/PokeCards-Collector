import { fetchHoloCards } from '../scrapers/holo_scraper';
import { fetchPokemonTypes } from '../scrapers/types_scraper';
import { HOLO_CARDS, TYPES } from '../scrapers/files';
import { uploadFile } from '../scrapers/upload';

interface Env {
	// Define environment variables expected by the function, including R2 bindings
	R2_BUCKET_NAME: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	R2_ENDPOINT: string;
	// Add other bindings like KV, D1 if needed by scrapers implicitly

	// Allow other string keys to match Record<string, string>
	[key: string]: any; // or `string | undefined` if more specific
}

// Cloudflare Pages Functions context type
interface PagesFunctionContext<E extends Env = Env, P extends string = any, D extends Record<string, any> = Record<string, any>> {
	request: Request;
	env: E;
	params: P;
	waitUntil: (promise: Promise<any>) => void;
	next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
	functionPath: string;
	data: D;
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
	console.log('Starting regeneration of assets...');

	try {
		// It's important that scraper functions can run in a serverless environment.
		// They should not rely on writing to arbitrary disk locations beyond /tmp or expect persistent state outside of R2/KV/D1.
		// Also, ensure they don't depend on process.env directly but can accept env vars or have them set in the Pages Function environment.

		// Run scrapers
		console.log('Fetching holo cards...');
		await fetchHoloCards(); // This will write to HOLO_CARDS path in ephemeral storage
		console.log('Fetching Pokemon types...');
		await fetchPokemonTypes(); // This will write to TYPES path in ephemeral storage

		// Upload generated files
		console.log(`Uploading ${HOLO_CARDS}...`);
		await uploadFile(HOLO_CARDS, 'holo-cards.json', { env: context.env });
		console.log(`Uploading ${TYPES}...`);
		await uploadFile(TYPES, 'types.json', { env: context.env });

		console.log('Successfully regenerated and uploaded assets.');
		return new Response(JSON.stringify({ success: true, message: 'Assets regenerated and uploaded.' }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error: any) {
		console.error('Failed to regenerate assets:', error);
		return new Response(JSON.stringify({ success: false, message: 'Failed to regenerate assets.', error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
