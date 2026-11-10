import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit/hooks';
import { getProfileByAuthId } from '#lib/services/profiles.ts';
import type { UserProfile } from '#lib/types.js';

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

export const handle: Handle = async ({ event, resolve }) => {
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

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/** The Supabase client reads `content-range` (row counts) from server-side fetches replayed in the browser, so it must pass this filter. */
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
