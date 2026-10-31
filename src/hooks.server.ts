import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { getProfileByAuthId } from '$lib/services/profiles';
import type { UserProfile } from '$lib/types';

/**
 * Endpoints that never read `locals.user`, `locals.profile` or `locals.supabase`, so they skip the `auth.getUser()` round
 * trip and the profile select. An allowlist: a new route resolves the session until it is listed here.
 */
const PUBLIC_ROUTES = new Set([
	'/api/[grid=catalogueGrid]-cards',
	'/api/binder',
	'/api/card-dle/guess',
	'/api/card-dle/suggestions',
	'/api/cards-list',
	'/api/image-proxy',
	'/api/search',
	'/api/search-users',
	'/sitemap-[catalogue=catalogue]-cards/[page]',
	'/sitemap-cards/[page]',
	'/sitemap-pages.xml',
	'/sitemap.xml',
]);

export const handle: Handle = async ({ event, resolve }) => {
	let authHeadersSet = false;

	// Create a Supabase client specific to this server request using @supabase/ssr
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet, headers) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
					// A response that sets auth cookies carries `no-store` headers from the library, so a CDN never shares one user's session; `setHeaders` throws on a repeat.
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
			// If user is authenticated, fetch their profile
			const { data: userProfile, error: profileError } = await getProfileByAuthId(user.id, event.locals.supabase);

			if (profileError) {
				console.error(`Error fetching profile for user ${user.id} in hook:`, profileError);
			} else {
				profile = userProfile;
			}
		}
	}

	// Assign the potentially null user and profile to locals
	event.locals.user = user;
	event.locals.profile = profile;

	// Resolve the request
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Need to ensure the content-range header is exposed for Supabase
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
