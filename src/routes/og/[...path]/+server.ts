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

/**
 * Renders once per path and colo: the Cache API holds each PNG under its origin, path and `OG_REVISION`, and the `?v=` the page loads put on
 * `og:image` is ignored, so a forged or stale `v` hits the same entry and never multiplies renders. `v` only makes Discord, X or Google
 * fetch the image again when the data moved. A complete image lives a day, in the Cache API and in browsers, so a share image can show a
 * price up to a day old (already rounded to 2 significant digits) and a user image shows a privacy change or a price move within a day.
 * An image missing a scan is served for a minute and not cached, so the next fetch renders it again.
 * The Cache API is a no-op on `workers.dev` and under `vite dev`, which render every request.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const target = parseTarget(params.path);
	if (!target) error(404, 'Unknown image');

	const cache = edgeCache();
	const key = new Request(`${url.origin}${url.pathname}?r=${OG_REVISION}`);
	const hit = await cache?.match(key);
	if (hit) return hit;

	const rendered = await renderOgImage(target);
	if (!rendered) error(404, 'Not found');

	const response = new Response(rendered.png, { headers: { 'cache-control': rendered.complete ? 'public, max-age=86400' : 'public, max-age=60', 'content-type': 'image/png' } });
	if (cache && rendered.complete) waitUntil(cache.put(key, response.clone()));
	return response;
};
