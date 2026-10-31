import {defineEnvVars} from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** Dev switch read at runtime, so it can be flipped without a rebuild. */
	PUBLIC_NO_IMAGES: {public: true, schema: (input) => input ?? ''},
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {public: true, static: true},
	PUBLIC_SUPABASE_URL: {public: true, static: true},
	/** A Worker secret, absent at build time, and the endpoints that need it answer `500` themselves when it is missing. */
	SUPABASE_SECRET_KEY: {schema: (input) => input ?? ''},
});
