import { error } from '@sveltejs/kit';
import { BASE_URL } from '#src/constants.ts';
import type { RequestHandler } from './$types';

/** SVG is left out on purpose: it can run scripts, and serving one from our own origin would be a stored XSS. */
const ALLOWED_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);

const MAX_BYTES = 12 * 1024 * 1024;

/** The site's custom domain, its `workers.dev` and preview hostnames and localhost: all of them would loop the proxy back into this Worker. */
const CUSTOM_HOSTNAME = new URL(BASE_URL).hostname;
const isOwnHost = (hostname: string, requestHostname: string) =>
	hostname === requestHostname
	|| hostname === CUSTOM_HOSTNAME
	|| hostname === 'localhost'
	|| hostname.endsWith('.workers.dev');

/** Errors the stream past `limit` bytes, since `content-length` is missing on a chunked upstream and cannot be trusted alone. */
const capBytes = (limit: number) => {
	let received = 0;
	return new TransformStream<Uint8Array, Uint8Array>({
		transform(chunk, controller) {
			received += chunk.byteLength;
			if (received > limit) controller.error(new Error('Image is too large to proxy'));
			else controller.enqueue(chunk);
		},
	});
};

/**
 * Proxies the user-supplied image URLs a binder draws on its canvas, and nothing else. Card art needs no proxy
 * because `assets.tcgdex.net` is CORS-open.
 *
 * The endpoint is public, so it is an image proxy, not a URL proxy: HTTPS only, never our own origin, and the
 * upstream `content-type` must be a known raster image before any byte is returned. Forwarding it as-is would let
 * anyone serve HTML from `pokecards-collector.ayfri.com`.
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
	if (isOwnHost(parsed.hostname, url.hostname)) throw error(400, 'Refusing to proxy our own origin');

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

	return new Response(response.body?.pipeThrough(capBytes(MAX_BYTES)), {
		headers: {
			'cache-control': 'public, max-age=31536000, immutable',
			/** The response is never a document, so the type is pinned and the browser is forbidden from treating it as one. */
			'content-security-policy': "default-src 'none'; sandbox",
			'content-type': contentType,
			'x-content-type-options': 'nosniff',
		},
	});
};
