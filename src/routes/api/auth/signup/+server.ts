import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { SUPABASE_SECRET_KEY } from '$app/env/private';
import { type ApiError, readJson } from '#helpers/utils.ts';
import { isStrongPassword, normalizeUsername, PASSWORD_REQUIREMENTS, USERNAME_PATTERN, USERNAME_REQUIREMENTS } from '#src/constants.ts';

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		let userData: SignupBody;
		try {
			userData = await request.json() as SignupBody;
		} catch (parseError) {
			return Response.json({
				error: 'Invalid JSON data',
				success: false
			}, { status: 400 });
		}

		const { email, password, username } = userData;

		if (!email || !password || !username) {
			return Response.json({
				error: 'Missing required fields',
				success: false
			}, { status: 400 });
		}

		const normalizedUsername = normalizeUsername(username);

		if (!USERNAME_PATTERN.test(normalizedUsername)) {
			return Response.json({
				error: USERNAME_REQUIREMENTS,
				success: false
			}, { status: 400 });
		}

		if (!isStrongPassword(password)) {
			return Response.json({
				error: PASSWORD_REQUIREMENTS,
				success: false
			}, { status: 400 });
		}

		const supabaseUrl = PUBLIC_SUPABASE_URL;
		const supabaseSecretKey = SUPABASE_SECRET_KEY;

		if (!supabaseUrl || !supabaseSecretKey) {
			return Response.json({
				error: 'Server configuration error',
				success: false
			}, { status: 500 });
		}

		let supabaseAdmin;
		try {
			supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
		} catch (clientError) {
			return Response.json({
				error: 'Failed to initialize database connection',
				success: false
			}, { status: 500 });
		}

		/** The lookup uses the normalized (lowercase) username because the column stores that form, which makes the check case-insensitive. */
		let existingUser;
		try {
			const result = await supabaseAdmin
				.from('profiles')
				.select('username')
				.eq('username', normalizedUsername);

			if (result.error) throw result.error;
			existingUser = result.data;
		} catch (checkError) {
			return Response.json({
				error: 'Error checking username availability',
				success: false
			}, { status: 500 });
		}

		if (existingUser && existingUser.length > 0) {
			return Response.json({
				error: 'Username already taken',
				success: false
			}, { status: 400 });
		}

		let authData: { user: AdminUser | null };
		let authError;

		try {
			/** The admin REST endpoint is called directly because the JS client wraps it in a session flow this route does not want. */
			const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
				body: JSON.stringify({
					email,
					email_confirm: true,
					password
				}),
				headers: {
					'apikey': supabaseSecretKey,
					'Authorization': `Bearer ${supabaseSecretKey}`,
					'Content-Type': 'application/json'
				},
				method: 'POST'
			});

			if (!createUserResponse.ok) {
				const errorBody = await readJson<ApiError>(createUserResponse, {});
				let errorMessage = errorBody.message || createUserResponse.statusText || 'Unknown error during user creation';
				if (errorBody.message?.toLowerCase().includes('email address already registered')) {
					errorMessage = 'This email address is already registered.';
				}

				/** A 422 from the admin endpoint usually means the email already exists. */
				if (createUserResponse.status === 422 && errorMessage.includes('email')) {
						 errorMessage = 'This email address is already registered.';
				}

				return Response.json({
					error: `Failed to create user: ${errorMessage}`,
					success: false
				}, { status: createUserResponse.status });
			}

			authData = {
				user: await createUserResponse.json() as AdminUser
			};
			authError = null;
		} catch (createError) {
			/** The standard client signs the user up when the admin endpoint is unreachable. */
			try {
				const result = await supabaseAdmin.auth.signUp({
					email,
					options: {
						data: {
							username: normalizedUsername
						}
					},
					password
				});

				authData = result.data;
				authError = result.error;
			} catch (fallbackError) {
				return Response.json({
					error: 'User creation failed after multiple attempts',
					success: false
				}, { status: 500 });
			}
		}

		if (authError) {
			return Response.json({
				error: authError.message,
				success: false
			}, { status: 400 });
		}

		if (!authData.user) {
			return Response.json({
				error: 'User could not be created',
				success: false
			}, { status: 500 });
		}

		if (!authData.user.id) {
			return Response.json({
				error: 'User data missing for profile creation',
				success: false
			}, { status: 500 });
		}

		let profileError: string | null = null;
		try {
			const profileData = {
				auth_id: authData.user.id,
				created_at: new Date().toISOString(),
				is_public: true,
				updated_at: new Date().toISOString(),
				username: normalizedUsername
			};

			const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
				body: JSON.stringify(profileData),
				headers: {
					'apikey': supabaseSecretKey,
					'Authorization': `Bearer ${supabaseSecretKey}`,
					'Content-Type': 'application/json',
					'Prefer': 'return=representation'
				},
				method: 'POST'
			});

			if (!profileResponse.ok) {
				const errorBody = await readJson<ApiError>(profileResponse, {});
				profileError = `Profile creation failed: ${errorBody.message || 'Unknown error'}`;
			}
		} catch (insertError) {
			profileError = 'Profile creation failed';
		}

		if (profileError) {
			/** A user with no profile row is unusable, so the auth user is deleted again. */
			try {
				await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.user.id}`, {
					headers: {
						'apikey': supabaseSecretKey,
						'Authorization': `Bearer ${supabaseSecretKey}`
					},
					method: 'DELETE'
				});
			} catch (deleteError) {
				/** Rollback is best effort: the original failure is the one reported. */
			}

			return Response.json({
				error: profileError,
				success: false
			}, { status: 500 });
		}

		return Response.json({
			success: true,
			user: {
				email: authData.user.email,
				id: authData.user.id
			}
		});

	} catch (error) {
		return Response.json({
			error: 'An unexpected error occurred',
			success: false
		}, { status: 500 });
	}
};
