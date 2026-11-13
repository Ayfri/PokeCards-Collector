import { error } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { isLanguage } from '#helpers/catalogues.ts';
import { edgeCache } from '#helpers/data-cache.ts';
import { OG_PAGES, OG_REVISION, type OgPage, type OgTarget } from '#helpers/og-image.ts';
import { renderOgImage } from '#helpers/og-render.ts';
import type { RequestHandler } from './$types';

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

/** A cached image is only rendered again once it is this old, which bounds the renders a forged `?v=` can cause to one per path, hour and colo. */
const REFRESH_AFTER_MS = 3_600_000;

/** What a hit answers while its `?v=` is not the one asked for and it is not yet old enough to render again: Discord must not pin it to the new URL. */
const MISMATCH_MAX_AGE = 300;

/** A card or set image changes rarely and keeps a week; the others show a price move or a profile turned private within a day. */
const lifetimeSeconds = (kind: OgTarget['kind']): number => kind === 'card' || kind === 'set' ? 604_800 : 86_400;

const withMaxAge = (response: Response, seconds: number): Response => {
	const headers = new Headers(response.headers);
	headers.set('cache-control', `public, max-age=${seconds}`);
	return new Response(response.body, { headers });
};

/**
 * The Cache API holds one PNG per path and `OG_REVISION` in each colo, with the `?v=` it was rendered for (`x-og-v`, empty when the request
 * had none), its render time (`x-og-at`) and its expiry (`x-og-until`). The route reads no database and never redirects before answering.
 * A hit is served as is when the request has no `v` or the stored one. When the `v` differs, the data moved since: under an hour old, the hit is
 * served with a 5 minute `cache-control` instead of its stored one, so no preview pins the old PNG to the new URL; over an hour old, the image
 * renders again and replaces the entry. A forged `v` therefore never adds an entry and costs at most one render per path and hour in a colo
 * (the cache is per colo and the put runs in `waitUntil`, so concurrent requests can each render before the entry lands).
 * A complete image is cached for a week (card, set) or a day (page, collection, wishlist, profile), in the Cache API and in browsers.
 * When a refresh finds nothing (the card or set is gone) the entry is deleted and the answer is a 404; when it throws, the hit is served
 * for 5 minutes instead of a 500. An image missing a scan is served for a minute and not cached; when a refresh renders one, the older complete
 * entry is served and put back with a renewed `x-og-at` but its original expiry, so incomplete renders do not repeat on every request.
 * The Cache API is a no-op on `workers.dev` and under `vite dev`, which render every request.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const target = parseTarget(params.path);
	if (!target) error(404, 'Unknown image');

	const cache = edgeCache();
	const key = new Request(`${url.origin}${url.pathname}?r=${OG_REVISION}`);
	const version = url.searchParams.get('v') ?? '';
	const hit = await cache.match(key);
	const mismatch = Boolean(hit && version && version !== hit.headers.get('x-og-v'));
	if (hit && !(mismatch && Date.now() - Number(hit.headers.get('x-og-at')) >= REFRESH_AFTER_MS)) return mismatch ? withMaxAge(hit, MISMATCH_MAX_AGE) : hit;

	const rendered = await renderOgImage(target).catch((cause: unknown) => {
		if (!hit) throw cause;
		return undefined;
	});
	if (hit) {
		if (rendered === undefined) return withMaxAge(hit, MISMATCH_MAX_AGE);
		if (!rendered) {
			waitUntil(cache.delete(key));
			error(404, 'Not found');
		}
		if (!rendered.complete) {
			const remaining = Math.floor((Number(hit.headers.get('x-og-until')) - Date.now()) / 1000);
			const stale = withMaxAge(hit.clone(), MISMATCH_MAX_AGE);
			if (remaining > 0) {
				const renewed = withMaxAge(hit, remaining);
				renewed.headers.set('x-og-at', String(Date.now()));
				waitUntil(cache.put(key, renewed));
			}
			return stale;
		}
	}
	if (!rendered) error(404, 'Not found');

	const seconds = lifetimeSeconds(target.kind);
	const response = new Response(rendered.png, {
		headers: {
			'cache-control': `public, max-age=${rendered.complete ? seconds : 60}`,
			'content-type': 'image/png',
			'x-og-at': String(Date.now()),
			'x-og-until': String(Date.now() + seconds * 1000),
			'x-og-v': version,
		},
	});
	if (rendered.complete) waitUntil(cache.put(key, response.clone()));
	return response;
};
