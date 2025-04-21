import { supabase } from '../supabase';
import type { Session, User, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { authStore } from '../stores/auth';
import { get } from 'svelte/store';

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

// Helper to fetch user profile
async function _fetchUserProfile(userId: string): Promise<any | null> {
	try {
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('auth_id', userId)
			.single();

		if (error) {
			console.error('Error fetching user profile:', error);
			return null;
		}
		return profile || null;
	} catch (error) {
		console.error('Exception fetching user profile:', error);
		return null;
	}
}

// --- Public Auth Functions ---

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;

export function isSessionExpired(session: Session | null): boolean {
	if (!session?.expires_at) {
		return true;
	}
	const expiryTime = session.expires_at * 1000;
	const currentTime = Date.now();
	const fiveMinutesInMs = 5 * 60 * 1000;
	return currentTime > expiryTime - fiveMinutesInMs;
}

// Note: getCurrentUser and getSession might not be strictly needed now
// if the authStore is the single source of truth derived from onAuthStateChange.
// However, they can be useful for imperative checks if required.

export async function getCurrentUser(): Promise<{ user: User | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	try {
		// Use the store as the primary source if initialized
		const currentStore = get(authStore);
		if (currentStore.initialized) {
			return { user: currentStore.user, error: currentStore.error ? _createSimpleError(currentStore.error) : null };
		}
		// Fallback to Supabase if store not initialized (e.g., server-side context?)
		const { data, error } = await supabase.auth.getUser();
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

export async function getSession(): Promise<{ session: Session | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	try {
		const { data, error } = await supabase.auth.getSession();
		if (error) {
			_logAuthError(error.message, 'getting session', error);
			return { session: null, error };
		}
		if (data.session && isSessionExpired(data.session)) {
			console.log('[AuthService] Session expired, attempting refresh...');
			return await refreshToken(); // refreshToken interacts with store via events
		}
		return { session: data.session, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'getting session', error);
		return { session: null, error: _createSimpleError('An unexpected error occurred while getting the session') };
	}
}

export async function refreshToken(): Promise<{ session: Session | null; error: SupabaseAuthError | SimpleAuthError | null }> {
	if (isRefreshing) {
		return { session: null, error: null };
	}
	isRefreshing = true;
	console.log('[AuthService] Refreshing authentication token...');
	try {
		// refreshSession will trigger onAuthStateChange, updating the store
		const { data, error } = await supabase.auth.refreshSession();
		if (error) {
			_logAuthError(error.message, 'token refresh', error);
			// Don't manually update store, let listener handle SIGNED_OUT/error
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
	try {
		// signInWithPassword will trigger onAuthStateChange (SIGNED_IN)
		const { data, error } = await supabase.auth.signInWithPassword({
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
		// Success state will be handled by the authStore listener
		return { user: data.user, session: data.session, error: null };
	} catch (error: any) {
		_logAuthError(error.message, 'sign in', error);
		return { user: null, session: null, error: _createSimpleError('An unexpected error occurred during sign in') };
	}
}

export async function signOut(): Promise<{ error: SupabaseAuthError | SimpleAuthError | null }> {
	try {
		// Store reset is now handled by the listener on SIGNED_OUT event
		// localStorage is also handled by the store reset method
		const { error } = await supabase.auth.signOut();
		if (error) {
			_logAuthError(error.message, 'sign out', error);
			// Still proceed with potential reload
		}
		// Reloading might still be desired depending on app structure
		// Consider using goto('/', { invalidateAll: true }) for cleaner state reset in SvelteKit
		setTimeout(() => window.location.reload(), 100);
		return { error };
	} catch (error: any) {
		_logAuthError(error.message, 'sign out', error);
		setTimeout(() => window.location.reload(), 100);
		return { error: _createSimpleError('An unexpected error occurred during sign out') };
	}
}

export async function signUp(email: string, password: string, username: string): Promise<AuthResponse> {
	try {
		// 1. Sign up user - may trigger onAuthStateChange if auto-confirm/sign-in
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
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

		// 2. Create profile entry
		// WARNING: Still potentially insecure from client-side.
		const { error: profileError } = await supabase
			.from('profiles')
			.insert({
				auth_id: authData.user.id,
				is_public: true,
				username,
			})
			.select()
			.single();

		if (profileError) {
			const errMsg = `Profile creation failed: ${profileError.message}`;
			_logAuthError(errMsg, 'sign up profile creation', profileError);
			// User exists in auth but profile creation failed.
			return { user: null, session: null, error: _createSimpleError(errMsg, 'ProfileCreationError') };
		}

		// Success. If auto-confirm is on, listener will handle SIGNED_IN.
		// If email confirmation needed, user/session is returned but store won't auto-update profile yet.
		return { user: authData.user, session: authData.session, error: null };

	} catch (error: any) {
		_logAuthError(error.message, 'sign up', error);
		return { user: null, session: null, error: _createSimpleError('An unexpected error occurred during sign up') };
	}
}
