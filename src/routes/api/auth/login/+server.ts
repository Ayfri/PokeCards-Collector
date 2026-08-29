import { isHttpError, json, error as svelteKitError, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { email, password } = await request.json() as { email?: string; password?: string };

		if (!email || !password) {
			throw svelteKitError(400, 'Email and password are required');
		}

		const { data, error: supabaseError } = await locals.supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (supabaseError) {
			console.error('Sign in error:', supabaseError.message);
			throw svelteKitError(401, 'Invalid login credentials');
		}

		if (!data.session || !data.user) {
			console.error('Sign in successful but no session/user returned');
			throw svelteKitError(500, 'Login failed unexpectedly');
		}

		/** The session stays out of the body on purpose: the SSR helper already set the cookies the client reads it from. */
		return json({ success: true, message: 'Login successful' });

	} catch (err) {
		if (isHttpError(err)) throw err;

		console.error('Unexpected error during sign in:', err);
		throw svelteKitError(500, 'An unexpected error occurred during login.');
	}
}; 