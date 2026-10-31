import { json, type RequestHandler } from '@sveltejs/kit';
import { error as svelteKitError } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
	const { error: supabaseError } = await locals.supabase.auth.signOut();

	if (supabaseError) {
		console.error('Error during sign out:', supabaseError);
		throw svelteKitError(500, 'Error logging out. Please try again.');
	}

	/** The Supabase SSR helper clears the auth cookies during `signOut`. */
	return json({ success: true });
}; 