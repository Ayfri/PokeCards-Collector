import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** SVG is deliberately absent: it is a scriptable document, and echoing one back under our own origin is stored XSS. */
const ALLOWED_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Proxies the user-supplied image URLs a binder draws on its canvas, and nothing else. Card art comes straight
 * from `assets.tcgdex.net`, which is CORS-open.
 *
 * The endpoint is public, so it is written as an image proxy rather than a URL proxy: HTTPS only, never our own
 * origin, and the upstream `content-type` has to be a raster image we recognise before a single byte is echoed
 * back. Forwarding it verbatim would let anyone serve HTML from `pokecards-collector.ayfri.com`.
 */
export const GET: RequestHandler = async ({ fetch, url }) => {
	const target = url.searchParams.get('url');
	if (!target) throw error(400, 'Missing URL parameter');

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		throw error(400, 'Malformed URL parameter');
	}

	if (parsed.protocol !== 'https:') throw error(400, 'Only https image URLs are proxied');
	if (parsed.origin === url.origin) throw error(400, 'Refusing to proxy our own origin');

	const response = await fetch(parsed, { cf: { cacheEverything: true, cacheTtl: 31536000 } })
		.catch((err: unknown) => {
			console.error('Image proxy could not reach the upstream:', err);
			throw error(502, 'Failed to fetch image');
		});

	if (!response.ok) throw error(502, 'Failed to fetch image');

	const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
	if (!ALLOWED_TYPES.has(contentType)) throw error(415, 'The URL does not point at a supported image');

	const declaredLength = Number(response.headers.get('content-length'));
	if (declaredLength > MAX_BYTES) throw error(413, 'Image is too large to proxy');

	return new Response(response.body, {
		headers: {
			'cache-control': 'public, max-age=31536000, immutable',
			// Nothing here is a document, so pin the type and forbid the browser from ever treating it as one.
			'content-security-policy': "default-src 'none'; sandbox",
			'content-type': contentType,
			'x-content-type-options': 'nosniff',
		},
	});
};
