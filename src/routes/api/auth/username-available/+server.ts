import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { normalizeUsername, USERNAME_PATTERN, USERNAME_REQUIREMENTS } from '$helpers/username';
import { isUsernameTaken } from '$lib/services/profiles';
import type { RequestHandler } from './$types';

/**
 * Backs the registration form's "username already taken" check, before the user has any session. A taken
 * username can belong to a private profile that no anonymous read can see, so the lookup runs with the
 * service key. It only returns a boolean, which the signup endpoint would reveal anyway.
 */
export const GET: RequestHandler = async ({ url }) => {
	const username = normalizeUsername(url.searchParams.get('username') ?? '');

	if (!username) {
		return json({ success: false, error: 'Missing username' }, { status: 400 });
	}

	if (!USERNAME_PATTERN.test(username)) {
		return json({ success: false, error: USERNAME_REQUIREMENTS }, { status: 400 });
	}

	if (!env.SUPABASE_SECRET_KEY) {
		console.error('Username availability check is missing SUPABASE_SECRET_KEY');
		return json({ success: false, error: 'Could not check username availability' }, { status: 500 });
	}

	const admin = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
	const { exists, error } = await isUsernameTaken(username, admin);

	if (error) {
		console.error('Username availability check failed:', error);
		return json({ success: false, error: 'Could not check username availability' }, { status: 500 });
	}

	return json({ success: true, exists });
};
