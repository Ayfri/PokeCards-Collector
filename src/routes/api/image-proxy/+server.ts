import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');

	if (!imageUrl) {
		throw error(400, 'Missing image URL parameter');
	}

	try {
		const response = await fetch(imageUrl, {
			headers: {
				// Optional: Add headers if the target site requires them (e.g., User-Agent)
				// 'User-Agent': 'PokéStore-Image-Proxy/1.0' 
			}
		});

		if (!response.ok) {
			console.error(`Proxy failed for ${imageUrl}: ${response.status} ${response.statusText}`);
			throw error(response.status, `Failed to fetch image from upstream server: ${response.statusText}`);
		}

		// Get content type and body
		const contentType = response.headers.get('content-type') || 'application/octet-stream';
		const buffer = await response.arrayBuffer();

		// Return the image data with correct headers
		return new Response(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400' // Cache for 1 day
			}
		});

	} catch (e: any) {
		console.error(`Error proxying image ${imageUrl}:`, e);
		if (e?.status) {
			// Re-throw SvelteKit errors
			throw e;
		} else {
			// Throw a generic server error for other fetch issues
			throw error(500, `Could not proxy image: ${e.message || 'Unknown error'}`);
		}
	}
}; 