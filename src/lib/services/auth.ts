import { getSupabaseBrowserClient } from '../supabase';
import type { Session, User, AuthError as SupabaseAuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { authStore } from '../stores/auth';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

// Define a simpler error type for internal error reporting if needed
interface SimpleAuthError {
	name: string;
	message: string;
}

// Type for the public return values of auth functions
export interface AuthResponse {
	error: SimpleAuthError | SupabaseAuthError | null;
	session: Session | null;
	user: User | null;
}

// --- Private Helper Functions ---

function _logAuthError(message: string, operation: string, error?: any) {
	console.error(`[AuthService] ${operation} error: ${message}`, error || '');
}

function _createSimpleError(message: string, name: string = 'UnknownAuthError'): SimpleAuthError {
	return { name, message };
}

// --- Public Auth Functions ---

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;

// Function to get the client, ensures it's called client-side
function getClient() {
	if (!browser) {
		console.warn('[AuthService] Attempted to get Supabase client on the server. Use locals.supabase instead.');
		return null; // Or throw error? Returning null for now.
	}
	const client = getSupabaseBrowserClient();
	if (!client) {
		throw new Error('Supabase browser client not initialized.');
	}
	return client;
}

export function isSessionExpired(session: Session | null): boolean {
	if (!session?.expires_at) {
		return true;
	}
	const expiryTime = session.expires_at * 1000;
	const currentTime = Date.now();
	const fiveMinutesInMs = 5 * 60 * 1000;
	return currentTime > expiryTime - fiveMinutesInMs;
}

// Deprecate direct use? Store should be source of truth client-side.
export async function getCurrentUser(): Promise<{ user: User | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	if (!browser) return { user: null, error: _createSimpleError('Cannot get user on server') };
	const client = getClient();
	if (!client) return { user: null, error: _createSimpleError('Client not available') };
	try {
		const { data, error } = await client.auth.getUser();
		if (error) {
			_logAuthError(error.message, 'getting user', error);
			return { user: null, error };
		}
		return { user: data?.user ?? null, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'getting user', error);
		return { user: null, error: _createSimpleError('An unexpected error occurred while getting the user') };
	}
}

// Deprecate direct use?
export async function getSession(): Promise<{ session: Session | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	if (!browser) return { session: null, error: _createSimpleError('Cannot get session on server') };
	const client = getClient();
	if (!client) return { session: null, error: _createSimpleError('Client not available') };
	try {
		const { data, error } = await client.auth.getSession();
		if (error) {
			_logAuthError(error.message, 'getting session', error);
			return { session: null, error };
		}
		if (data.session && isSessionExpired(data.session)) {
			console.log('[AuthService] Session expired, attempting refresh...');
			return await refreshToken(); // Ensure refreshToken uses the correct client
		}
		return { session: data.session, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'getting session', error);
		return { session: null, error: _createSimpleError('An unexpected error occurred while getting the session') };
	}
}

export async function refreshToken(): Promise<{ session: Session | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	if (!browser) return { session: null, error: _createSimpleError('Cannot refresh token on server') };
	const client = getClient();
	if (!client) return { session: null, error: _createSimpleError('Client not available') };

	if (isRefreshing) {
		return { session: null, error: null };
	}
	isRefreshing = true;
	console.log('[AuthService] Refreshing authentication token...');
	try {
		const { data, error } = await client.auth.refreshSession(); // Use client instance
		if (error) {
			_logAuthError(error.message, 'token refresh', error);
			return { session: null, error };
		}
		console.log('[AuthService] Token refreshed successfully via refreshSession.');
		return { session: data.session, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'token refresh', error);
		return { session: null, error: _createSimpleError('An unexpected error occurred during token refresh') };
	} finally {
		isRefreshing = false;
	}
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
	if (!browser) return { user: null, session: null, error: _createSimpleError('Cannot sign in on server') };
	const client = getClient();
	if (!client) return { user: null, session: null, error: _createSimpleError('Client not available') };
	try {
		const { data, error } = await client.auth.signInWithPassword({ // Use client instance
			email,
			password,
		});
		if (error) {
			_logAuthError(error.message, 'sign in', error);
			return { user: null, session: null, error };
		}
		if (!data.user || !data.session) {
			const errMsg = 'Sign in completed but no user/session returned';
			_logAuthError(errMsg, 'sign in');
			return { user: null, session: null, error: _createSimpleError(errMsg, 'SignInError') };
		}
		return { user: data.user, session: data.session, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'sign in', error);
		return { user: null, session: null, error: _createSimpleError('An unexpected error occurred during sign in') };
	}
}

export async function signOut(): Promise<{ error: SupabaseAuthError | SimpleAuthError | null }> {
	if (!browser) return { error: _createSimpleError('Cannot sign out on server') };
	const client = getClient();
	if (!client) return { error: _createSimpleError('Client not available') };
	try {
		const { error } = await client.auth.signOut(); // Use client instance
		if (error) {
			_logAuthError(error.message, 'sign out', error);
		}
		setTimeout(() => window.location.reload(), 100);
		return { error };
	} catch (error: any) {
		_logAuthError(error.message, 'sign out', error);
		setTimeout(() => window.location.reload(), 100);
		return { error: _createSimpleError('An unexpected error occurred during sign out') };
	}
}

export async function signUp(email: string, password: string, username: string): Promise<AuthResponse> {
	console.warn('[AuthService] signUp called client-side. Consider moving to server action.');
	if (!browser) return { user: null, session: null, error: _createSimpleError('Cannot sign up on server') };
	const client = getClient();
	if (!client) return { user: null, session: null, error: _createSimpleError('Client not available') };
	try {
		// 1. Sign up user
		const { data: authData, error: authError } = await client.auth.signUp({ // Use client instance
			email,
			password,
			// Note: Passing metadata/profile data here depends on Supabase settings
		});
		if (authError) {
			_logAuthError(authError.message, 'sign up', authError);
			return { user: null, session: null, error: authError };
		}
		if (!authData.user) {
			const errMsg = 'User sign up succeeded but no user data returned';
			_logAuthError(errMsg, 'sign up');
			return { user: null, session: null, error: _createSimpleError(errMsg, 'UserCreationError') };
		}

		// 2. Create profile entry - THIS SHOULD NOT BE DONE CLIENT SIDE
		// It bypasses RLS and is insecure. Profile creation MUST happen server-side.
		// Commenting out, assuming the API endpoint /api/auth/signup handles this.
		/*
		const { error: profileError } = await client // <-- Make sure this would use client too if uncommented
			.from('profiles')
			.insert({
				auth_id: authData.user.id,
				is_public: true,
				username,
			})
			.select()
			.single();

		if (profileError) {
			// ... (error handling) ...
		}
		*/
		console.log('[AuthService] SignUp successful via client. Profile creation MUST be handled by server API.');

		// Return auth data, session might be null if email confirmation is needed
		return { user: authData.user, session: authData.session, error: null };

	} catch (error: any) {
		_logAuthError(error.message, 'sign up', error);
		return { user: null, session: null, error: _createSimpleError('An unexpected error occurred during sign up') };
	}
}
