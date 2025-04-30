import { json, error as svelteKitError, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			throw svelteKitError(400, 'Email and password are required');
		}

		const { data, error: supabaseError } = await locals.supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (supabaseError) {
			console.error('Sign in error:', supabaseError.message);
			// Provide a generic error message for security
			throw svelteKitError(401, 'Invalid login credentials');
		}

		if (!data.session || !data.user) {
			console.error('Sign in successful but no session/user returned');
			throw svelteKitError(500, 'Login failed unexpectedly');
		}

		// Do NOT return the session or user details directly in the response
		// The Supabase SSR helper handles setting the necessary cookies based on the successful sign-in
		// The client will get the user session info via the updated cookies on subsequent requests/page loads
		return json({ success: true, message: 'Login successful' });

	} catch (err: any) {
		// Handle errors thrown by svelteKitError or other unexpected errors
		if (err.status) {
			// Re-throw SvelteKit errors
			throw err;
		} else {
			console.error('Unexpected error during sign in:', err);
			throw svelteKitError(500, 'An unexpected error occurred during login.');
		}
	}
}; 