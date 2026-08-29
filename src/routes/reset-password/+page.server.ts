import type { PageServerLoad } from './$types';

/** The page only ever renders behind a one-time recovery token from an email, so it has nothing to offer an index. */
export const load: PageServerLoad = async () => ({
	description: 'Choose a new password for your PokéCards-Collector account.',
	noindex: true,
	title: 'Reset Password',
});
