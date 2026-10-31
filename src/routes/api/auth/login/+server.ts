import { isHttpError, error as svelteKitError, type RequestHandler } from '@sveltejs/kit';

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

		/** The session is not returned in the body: the SSR helper already stored it in cookies, which is where the client reads it. */
		return Response.json({ success: true, message: 'Login successful' });

	} catch (err) {
		if (isHttpError(err)) throw err;

		console.error('Unexpected error during sign in:', err);
		throw svelteKitError(500, 'An unexpected error occurred during login.');
	}
}; 