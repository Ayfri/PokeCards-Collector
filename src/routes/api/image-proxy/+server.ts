import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) {
		throw error(400, 'Missing URL parameter');
	}

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw error(response.status, 'Failed to fetch image');
		}

		const contentType = response.headers.get('content-type') || 'image/jpeg';
		return new Response(response.body, {
			status: 200,
			headers: {
				'content-type': contentType,
				'cache-control': 'public, max-age=31536000' // 1 year caching
			}
		});
	} catch (err) {
		console.error('Image proxy error:', err);
		throw error(500, 'Failed to proxy image');
	}
}
