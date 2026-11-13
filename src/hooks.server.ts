import { version } from '$app/env';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { CACHE_ORIGIN, catalogueManifest, edgeCache, keepAlive } from '#helpers/data-cache.ts';
import { getProfileByAuthId } from '#lib/services/profiles.ts';
import type { UserProfile } from '#lib/types.js';

/**
 * Routes whose HTML depends only on the path and the catalogue: their loads read no session, cookie, header, query string, clock or randomness,
 * so one render serves every visitor without a session. A route that draws anything per visitor must not be listed.
 */
const CACHED_ROUTES = new Set([
	'/[[grid=catalogueGrid]]/sets',
	'/[[grid=catalogueGrid]]/sets/[setSlug]',
	'/[catalogue=catalogue]-card/[slug]',
	'/card/[slug]',
]);

/** A publish changes the cache key long before this: the age only bounds how long a colo keeps a page. */
const HTML_MAX_AGE = 86_400;

/**
 * Endpoints that never read `locals.user`, `locals.profile` or `locals.supabase`, so they skip the `auth.getUser()` round
 * trip and the profile select. It is an allowlist: a new route resolves the session until it is added here.
 */
const PUBLIC_ROUTES = new Set([
	'/api/[grid=catalogueGrid]-cards',
	'/api/binder',
	'/api/card-dle/guess',
	'/api/card-dle/suggestions',
	'/api/card-versions',
	'/api/cards-list',
	'/api/image-proxy',
	'/api/search',
	'/api/search-users',
	'/api/set-cards',
	'/[catalogue=catalogue]-card/[code=cardCode]',
	'/[sitemap=cardSitemap]/[page]',
	'/card/[code=cardCode]',
	'/og/[...path]',
	'/sitemap-pages.xml',
	'/sitemap.xml',
]);

/**
 * The cache key of a page a visitor without a session may be served from the colo cache, or `null` when the request must render. The key holds the
 * build version, since a stored document names the hashed files of its build and a later deploy removes them, and the catalogue's `publishedAt`,
 * since the page is built from it. A page rendered from an older catalogue or build is never read again, whatever its age.
 */
async function htmlCacheKey(event: RequestEvent): Promise<Request | null> {
	if (event.request.method !== 'GET' || event.isDataRequest || event.isSubRequest || event.url.search !== '') return null;
	if (!CACHED_ROUTES.has(event.route.id ?? '')) return null;
	if (event.cookies.getAll().some(({ name }) => name.startsWith('sb-'))) return null;

	try {
		const { publishedAt } = await catalogueManifest();
		/** SvelteKit decodes the params, so every percent-encoding of one path renders the same page and has to share one entry. */
		const path = encodeURI(decodeURI(event.url.pathname));
		return new Request(`${CACHE_ORIGIN}/html/${version}/${encodeURIComponent(publishedAt)}/${event.url.host}${path}`);
	} catch {
		/** A manifest failure or a malformed percent sequence: the render hits the same failure and reports it. */
		return null;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const cacheKey = await htmlCacheKey(event);
	const stored = cacheKey && await edgeCache().match(cacheKey).catch(() => undefined);

	if (stored) {
		const page = new Response(stored.body, stored);
		/** The stored copy needs `cache-control` to stay in the Cache API, but a visitor who kept the page would still see the anonymous one after signing in. */
		page.headers.delete('age');
		page.headers.delete('cache-control');
		return page;
	}

	let authHeadersSet = false;

	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet, headers) => {
					cookiesToSet.forEach(({ name, options, value }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
					/** The library sends `no-store` headers with auth cookies, so a CDN never shares one user's session. `setHeaders` throws if called twice. */
					if (!authHeadersSet) event.setHeaders(headers);
					authHeadersSet = true;
				},
			},
		}
	);

	let profile: UserProfile | null = null;
	let user = null;

	if (!PUBLIC_ROUTES.has(event.route.id ?? '')) {
		({ data: { user } } = await event.locals.supabase.auth.getUser());

		if (user) {
			const { data: userProfile, error: profileError } = await getProfileByAuthId(user.id, event.locals.supabase);

			if (profileError) {
				console.error(`Error fetching profile for user ${user.id} in hook:`, profileError);
			} else {
				profile = userProfile;
			}
		}
	}

	event.locals.user = user;
	event.locals.profile = profile;

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			/** The Supabase client reads `content-range` (row counts) from server-side fetches replayed in the browser, so it must pass this filter. */
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});

	if (cacheKey && response.status === 200 && !response.headers.has('set-cookie') && !response.headers.has('cache-control') && response.headers.get('content-type')?.startsWith('text/html')) {
		const headers = new Headers(response.headers);
		headers.set('cache-control', `public, max-age=${HTML_MAX_AGE}`);
		/** The body is read to its end before the store: a streamed promise that settles on a fallback after the headers left still sets `degraded`. */
		keepAlive(response.clone().arrayBuffer().then(body => event.locals.degraded ? undefined : edgeCache().put(cacheKey, new Response(body, { headers }))));
	}

	return response;
};
