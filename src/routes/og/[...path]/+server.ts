import { error } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { LANGUAGES, type Language } from '#helpers/catalogues.ts';
import { edgeCache } from '#helpers/data-cache.ts';
import { OG_PAGES, type OgPage, type OgTarget } from '#helpers/og-image.ts';
import { expectedOgVersion, OgReads, renderOgImage } from '#helpers/og-render.ts';
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
 * Renders once per URL and colo: the Cache API holds the PNG under its path and `?v=`, so a new price or card count is a new entry.
 * The `v` of a page, card or set image is checked against `expectedOgVersion` before anything renders: a missing or wrong one is
 * redirected to the right URL, so a forged `v` neither renders nor fills the cache. A card or set image is immutable for a week, a page
 * image refreshes daily. A user image (`profile`, `collection`, `wishlist`) has no version the route can know without replaying the page
 * load, so its cache key drops `v` and it lives one day: going private or a price move shows within a day.
 * The Cache API is a no-op on `workers.dev` and under `vite dev`, which render every request.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const target = parseTarget(params.path);
	if (!target) error(404, 'Unknown image');

	const user = 'username' in target;
	const given = url.searchParams.get('v');
	const keyFor = (version: string | null) => {
		const key = new URL(url.pathname, url.origin);
		if (version) key.searchParams.set('v', version);
		return new Request(key);
	};

	const cache = edgeCache();
	const hit = await cache?.match(keyFor(user ? null : given));
	if (hit) return hit;

	const reads = new OgReads();
	const version = user ? null : await expectedOgVersion(target, reads);
	if (version && given !== version) {
		/** A set version sums a whole table, so two isolates can disagree on it during a refresh: its redirect is never cached, or a browser could loop between them for 5 minutes. */
		const cacheControl = target.kind === 'set' ? 'no-store' : 'public, max-age=300';
		return new Response(null, { headers: { 'cache-control': cacheControl, location: `${url.pathname}?v=${version}` }, status: 302 });
	}

	const rendered = await renderOgImage(target, reads);
	if (!rendered) error(404, 'Not found');

	/** An image missing a scan is served for a minute only, so the next crawler fetch renders it again. */
	const maxAge = !rendered.complete ? 'public, max-age=60' : version && target.kind !== 'page' ? 'public, max-age=604800, immutable' : 'public, max-age=86400';
	const response = new Response(rendered.png, { headers: { 'cache-control': maxAge, 'content-type': 'image/png' } });
	if (cache && rendered.complete) waitUntil(cache.put(keyFor(version), response.clone()));
	return response;
};
