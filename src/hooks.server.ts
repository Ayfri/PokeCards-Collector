import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient, type CookieOptions, serialize } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { getProfileByAuthId } from '$lib/services/profiles';
import type { UserProfile } from '$lib/types';

export const handle: Handle = async ({ event, resolve }) => {
	// Create a Supabase client specific to this server request using @supabase/ssr
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => {
					return event.cookies.getAll();
				},
				setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				},
			},
		}
	);

	// Use getUser() to get the authenticated user
	const { data: { user } } = await event.locals.supabase.auth.getUser();
	
	let profile: UserProfile | null = null;

	if (user) {
		// If user is authenticated, fetch their profile
		const { data: userProfile, error: profileError } = await getProfileByAuthId(user.id);

		if (profileError) {
			console.error(`Error fetching profile for user ${user.id} in hook:`, profileError);
		} else {
			profile = userProfile;
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