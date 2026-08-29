import { json } from '@sveltejs/kit';
import { isUsernameTaken } from '$lib/services/profiles';
import type { RequestHandler } from './$types';

/** Backs the registration form's "username already taken" check, before the user has any session. */
export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username')?.trim() ?? '';

	if (!username) {
		return json({ success: false, error: 'Missing username' }, { status: 400 });
	}

	const { exists, error } = await isUsernameTaken(username);

	if (error) {
		console.error('Username availability check failed:', error);
		return json({ success: false, error: 'Could not check username availability' }, { status: 500 });
	}

	return json({ success: true, exists });
};
