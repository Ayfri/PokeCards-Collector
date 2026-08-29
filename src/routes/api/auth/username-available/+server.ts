import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { isUsernameTaken } from '$lib/services/profiles';
import type { RequestHandler } from './$types';

/**
 * Backs the registration form's "username already taken" check, before the user has any session. A taken
 * username can belong to a private profile, which no anonymous read reaches, so the lookup runs with the
 * service key and only ever leaks the boolean the signup endpoint would return anyway.
 */
export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username')?.trim() ?? '';

	if (!username) {
		return json({ success: false, error: 'Missing username' }, { status: 400 });
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
