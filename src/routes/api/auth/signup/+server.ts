import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { SUPABASE_SECRET_KEY } from '$app/env/private';
import { type ApiError, readJson } from '#helpers/utils.ts';
import { isUsernameTaken } from '#lib/services/profiles.ts';
import { isStrongPassword, normalizeUsername, PASSWORD_REQUIREMENTS, SUPABASE_DB_OPTIONS, USERNAME_PATTERN, USERNAME_REQUIREMENTS } from '#src/constants.ts';

interface SignupBody {
	email?: string;
	password?: string;
	username?: string;
}

/** User row returned by the Supabase admin users endpoint. */
interface AdminUser {
	email?: string;
	id: string;
}

const failure = (error: string, status: number) => Response.json({ error, success: false }, { status });

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null) as SignupBody | null;
	if (!body) return failure('Invalid JSON data', 400);

	const { email, password, username } = body;
	if (!email || !password || !username) return failure('Missing required fields', 400);

	const normalizedUsername = normalizeUsername(username);
	if (!USERNAME_PATTERN.test(normalizedUsername)) return failure(USERNAME_REQUIREMENTS, 400);
	if (!isStrongPassword(password)) return failure(PASSWORD_REQUIREMENTS, 400);
	if (!SUPABASE_SECRET_KEY) return failure('Server configuration error', 500);

	const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { db: SUPABASE_DB_OPTIONS });

	const { data: taken, error: lookupError } = await isUsernameTaken(normalizedUsername, supabaseAdmin);
	if (lookupError) return failure('Error checking username availability', 500);
	if (taken) return failure('Username already taken', 400);

	let user: AdminUser | null;

	/** The admin REST endpoint is called directly because the JS client wraps it in a session flow this route does not want. */
	const createUserResponse = await fetch(`${PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
		body: JSON.stringify({ email, email_confirm: true, password }),
		headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' },
		method: 'POST'
	}).catch(() => null);

	if (createUserResponse) {
		if (!createUserResponse.ok) {
			/** GoTrue puts its error text in `msg`, the same field auth-js reads first. */
			const { message, msg } = await readJson<ApiError & { msg?: string }>(createUserResponse, {});
			const text = msg || message || createUserResponse.statusText || 'Unknown error during user creation';
			/** A 422 from the admin endpoint usually means the email already exists. */
			const alreadyRegistered = text.toLowerCase().includes('email address already registered') || (createUserResponse.status === 422 && text.includes('email'));

			return failure(`Failed to create user: ${alreadyRegistered ? 'This email address is already registered.' : text}`, createUserResponse.status);
		}

		user = await readJson<AdminUser | null>(createUserResponse, null);
	} else {
		/**
		 * The standard client signs the user up when the admin endpoint is unreachable. It runs on a client of its own: `signUp` keeps the new user's
		 * session on the client that called it, and the profile insert below would then run as that user instead of the service role.
		 */
		const { data, error: signUpError } = await createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { db: SUPABASE_DB_OPTIONS }).auth.signUp({ email, options: { data: { username: normalizedUsername } }, password });
		if (signUpError) return failure(signUpError.message, 400);

		user = data.user;
	}

	if (!user) return failure('User could not be created', 500);

	const now = new Date().toISOString();
	const { error: profileError } = await supabaseAdmin.from('profiles').insert({
		auth_id: user.id,
		created_at: now,
		is_public: true,
		updated_at: now,
		username: normalizedUsername
	});

	if (profileError) {
		/** A user with no profile row is unusable, so the auth user is deleted again. Rollback is best effort: the original failure is the one reported. */
		await supabaseAdmin.auth.admin.deleteUser(user.id);

		return failure(`Profile creation failed: ${profileError.message || 'Unknown error'}`, 500);
	}

	return Response.json({ success: true, user: { email: user.email, id: user.id } });
};
