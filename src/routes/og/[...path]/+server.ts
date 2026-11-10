import { error } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { LANGUAGES, type Language } from '#helpers/catalogues.ts';
import { edgeCache } from '#helpers/data-cache.ts';
import { OG_PAGES, OG_REVISION, type OgPage, type OgTarget } from '#helpers/og-image.ts';
import { renderOgImage } from '#helpers/og-render.ts';
import type { RequestHandler } from './$types';

const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value);
const isPage = (value: string): value is OgPage => (OG_PAGES as readonly string[]).includes(value);

/** The inverse of `ogPath` in `og-image.ts`: `card/en/<code>.png`, `set/ja/<id>.png`, `profile/<user>.png`, `page/<name>.png`. */
function parseTarget(path: string): OgTarget | null {
	const [kind, first, second, ...rest] = path.replace(/\.png$/, '').split('/');
	if (rest.length || !first) return null;
	if ((kind === 'card' || kind === 'set') && isLanguage(first) && second) return kind === 'card' ? { code: second, kind, language: first } : { kind, language: first, setId: second };
	if (second) return null;
	if (kind === 'page') return isPage(first) ? { kind, name: first } : null;
	return kind === 'collection' || kind === 'profile' || kind === 'wishlist' ? { kind, username: first } : null;
}

/** A cached image is only replaced once it is this old, which bounds the renders a forged `?v=` can cause to one per path and hour. */
const REFRESH_AFTER_MS = 3_600_000;

/**
 * Renders once per path and colo: the Cache API holds each PNG under its origin, path and `OG_REVISION`, with the `?v=` it was rendered for
 * (`x-og-v`, empty when the request had none) and its render time (`x-og-at`). A hit is served as is, except when the request carries a `v`
 * different from the stored one and the entry is over an hour old: the data moved since, so the image renders again and replaces the entry.
 * A real change therefore shows within the hour (Discord pins an image to its `?v=` URL, so a stale PNG must never answer a fresh `v`), and a
 * forged `v` costs at most one render per path and hour. A complete image is cached for a week, in the Cache API and in browsers.
 * An image missing a scan is served for a minute and not cached, so the next fetch renders it again; when a refresh renders one, the older
 * complete entry is served instead and only its render time is renewed, so incomplete renders do not repeat on every request.
 * The Cache API is a no-op on `workers.dev` and under `vite dev`, which render every request.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const target = parseTarget(params.path);
	if (!target) error(404, 'Unknown image');

	const cache = edgeCache();
	const key = new Request(`${url.origin}${url.pathname}?r=${OG_REVISION}`);
	const version = url.searchParams.get('v') ?? '';
	const hit = await cache?.match(key);
	if (hit && (!version || version === hit.headers.get('x-og-v') || Date.now() - Number(hit.headers.get('x-og-at')) < REFRESH_AFTER_MS)) return hit;

	const rendered = await renderOgImage(target);
	if (hit && cache && !rendered?.complete) {
		const headers = new Headers(hit.headers);
		headers.set('x-og-at', String(Date.now()));
		waitUntil(cache.put(key, new Response(hit.clone().body, { headers })));
		return hit;
	}
	if (!rendered) error(404, 'Not found');

	const response = new Response(rendered.png, {
		headers: {
			'cache-control': rendered.complete ? 'public, max-age=604800' : 'public, max-age=60',
			'content-type': 'image/png',
			'x-og-at': String(Date.now()),
			'x-og-v': version,
		},
	});
	if (cache && rendered.complete) waitUntil(cache.put(key, response.clone()));
	return response;
};
