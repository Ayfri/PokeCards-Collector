import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { readJson, type ApiError } from '$helpers/http';
import { isStrongPassword, PASSWORD_REQUIREMENTS } from '$helpers/password';

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
			return json({
				success: false,
				error: 'Invalid JSON data'
			}, { status: 400 });
		}

		const { email, password, username } = userData;

		if (!email || !password || !username) {
			return json({
				success: false,
				error: 'Missing required fields'
			}, { status: 400 });
		}

		if (username.length > 20) {
			return json({
				success: false,
				error: 'Username cannot exceed 20 characters'
			}, { status: 400 });
		}

		const normalizedUsername = username.toLowerCase();

		if (!isStrongPassword(password)) {
			return json({
				success: false,
				error: PASSWORD_REQUIREMENTS
			}, { status: 400 });
		}

		const supabaseUrl = PUBLIC_SUPABASE_URL;
		const supabaseSecretKey = env.SUPABASE_SECRET_KEY;

		if (!supabaseUrl || !supabaseSecretKey) {
			return json({
				success: false,
				error: 'Server configuration error'
			}, { status: 500 });
		}

		let supabaseAdmin;
		try {
			supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
		} catch (clientError) {
			return json({
				success: false,
				error: 'Failed to initialize database connection'
			}, { status: 500 });
		}

		// Username check is case-insensitive: the column stores the lowercased form.
		let existingUser;
		let usernameCheckError;

		try {
			const result = await supabaseAdmin
				.from('profiles')
				.select('username')
				.eq('username', normalizedUsername);

			existingUser = result.data;
			usernameCheckError = result.error;
		} catch (checkError) {
			return json({
				success: false,
				error: 'Error checking username availability'
			}, { status: 500 });
		}

		if (usernameCheckError) {
			return json({
				success: false,
				error: 'Error checking username availability'
			}, { status: 500 });
		}

		if (existingUser && existingUser.length > 0) {
			return json({
				success: false,
				error: 'Username already taken'
			}, { status: 400 });
		}

		let authData: { user: AdminUser | null };
		let authError;

		try {
			// The admin REST endpoint is called directly; the JS client wraps it in a session flow this route does not want.
			const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': supabaseSecretKey,
					'Authorization': `Bearer ${supabaseSecretKey}`
				},
				body: JSON.stringify({
					email,
					password,
					email_confirm: true
				})
			});

			if (!createUserResponse.ok) {
				const errorBody = await readJson<ApiError>(createUserResponse, {});
				let errorMessage = errorBody.message || createUserResponse.statusText || 'Unknown error during user creation';
				if (errorBody.message?.toLowerCase().includes('email address already registered')) {
					errorMessage = 'This email address is already registered.';
				}

				// Check specifically for the 422 status which often indicates email exists
				if (createUserResponse.status === 422 && errorMessage.includes('email')) {
						 errorMessage = 'This email address is already registered.';
				}

				return json({
					success: false,
					error: `Failed to create user: ${errorMessage}`
				}, { status: createUserResponse.status });
			}

			authData = {
				user: await createUserResponse.json() as AdminUser
			};
			authError = null;
		} catch (createError) {
			// Fallback to the standard client when the admin endpoint is unreachable.
			try {
				const result = await supabaseAdmin.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: normalizedUsername
						}
					}
				});

				authData = result.data;
				authError = result.error;
			} catch (fallbackError) {
				return json({
					success: false,
					error: 'User creation failed after multiple attempts'
				}, { status: 500 });
			}
		}

		if (authError) {
			return json({
				success: false,
				error: authError.message
			}, { status: 400 });
		}

		if (!authData.user) {
			return json({
				success: false,
				error: 'User could not be created'
			}, { status: 500 });
		}


		if (!authData || !authData.user || !authData.user.id) {
			return json({
				success: false,
				error: 'User data missing for profile creation'
			}, { status: 500 });
		}

		try {
			const profileData = {
				username: normalizedUsername,
				auth_id: authData.user.id,
				is_public: true,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': supabaseSecretKey,
					'Authorization': `Bearer ${supabaseSecretKey}`,
					'Prefer': 'return=representation'
				},
				body: JSON.stringify(profileData)
			});

			if (!profileResponse.ok) {
				const errorBody = await readJson<ApiError>(profileResponse, {});

				// A user with no profile row is unusable, so roll the auth user back.
				try {
					await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.user.id}`, {
						method: 'DELETE',
						headers: {
							'apikey': supabaseSecretKey,
							'Authorization': `Bearer ${supabaseSecretKey}`
						}
					});
				} catch (deleteError) {
					// Rollback is best effort; the original failure is what gets reported.
				}

				return json({
					success: false,
					error: `Profile creation failed: ${errorBody.message || 'Unknown error'}`
				}, { status: 500 });
			}
		} catch (insertError) {
			// A user with no profile row is unusable, so roll the auth user back.
			try {
				await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.user.id}`, {
					method: 'DELETE',
					headers: {
						'apikey': supabaseSecretKey,
						'Authorization': `Bearer ${supabaseSecretKey}`
					}
				});
			} catch (deleteError) {
				// Rollback is best effort; the original failure is what gets reported.
			}

			return json({
				success: false,
				error: 'Profile creation failed'
			}, { status: 500 });
		}

		return json({
			success: true,
			user: {
				id: authData.user.id,
				email: authData.user.email
			}
		});

	} catch (error) {
		return json({
			success: false,
			error: 'An unexpected error occurred'
		}, { status: 500 });
	}
};
