import { fail } from '@sveltejs/kit';
import { isStrongPassword, PASSWORD_REQUIREMENTS } from '$helpers/password';
import type { Actions, PageServerLoad } from './$types';

/** The page only ever renders behind a one-time recovery token from an email, so it has nothing to offer an index. */
export const load: PageServerLoad = async ({ locals, url }) => ({
	authError: url.searchParams.get('auth_error'),
	description: 'Choose a new password for your PokéCards-Collector account.',
	noindex: true,
	/** `/auth/confirm` turns the recovery link into a session, so a user on `locals` is the proof the link was valid. */
	recovered: Boolean(locals.user),
	title: 'Reset Password',
});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Your reset link is no longer valid. Request a new one.' });

		const form = await request.formData();
		const password = form.get('password');
		const confirmPassword = form.get('confirmPassword');

		if (typeof password !== 'string' || typeof confirmPassword !== 'string' || !password) {
			return fail(400, { message: 'Please fill in all fields.' });
		}
		if (password !== confirmPassword) return fail(400, { message: 'Passwords do not match.' });
		if (!isStrongPassword(password)) return fail(400, { message: PASSWORD_REQUIREMENTS });

		const { error } = await locals.supabase.auth.updateUser({ password });

		if (error) {
			console.error('Password update failed:', error.message);
			return fail(400, { message: error.message });
		}

		return { message: 'Password updated. You are signed in.', success: true };
	},
};
