import { writable, get } from 'svelte/store';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../supabase';
import type { UserProfile } from '../types';
import { browser } from '$app/environment';

// Define types
interface AuthState {
	user: User | null;
	profile: UserProfile | null;
	loading: boolean; // Start true until listener provides initial state
	error: string | null;
	initialized: boolean; // Flag to track if initial state received
}

// Create initial state
const initialState: AuthState = {
	user: null,
	profile: null,
	loading: true,
	error: null,
	initialized: false
};

// --- Profile Fetch Helper ---
// Fetches the user profile from the database
async function fetchProfile(user: User | null): Promise<UserProfile | null> {
	if (!user || !browser) return null;
	const client = getSupabaseBrowserClient();
	if (!client) return null;
	try {
		const { data: profile, error } = await client
			.from('profiles')
			.select('*')
			.eq('auth_id', user.id)
			.single();

		if (error) {
			// Log error but return null, let caller handle state update
			console.error('Error fetching profile:', error);
			return null;
		}
		return profile;
	} catch (error) {
		// Log error but return null, let caller handle state update
		console.error('Exception fetching profile:', error);
		return null;
	}
}

// --- Store Creation ---
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		// Internal method for listener to update state
		_update: (newState: Partial<AuthState>) => update(state => ({ ...state, ...newState })),
		reset: () => {
			if (browser) {
				// Attempt to clear any potentially lingering local storage
				localStorage.removeItem('supabase.auth.token');
			}
			set({ ...initialState, loading: false, initialized: true }); // Reset but mark as initialized
		}
	};
}

// Export the store instance
export const authStore = createAuthStore();

// --- Auth State Change Listener (Client-side only) ---
// This runs once when the module loads on the client.
if (browser) {
	const client = getSupabaseBrowserClient();

	if (client) {
		client.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
			const currentState = get(authStore);

			if (!currentState.initialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
				authStore._update({ initialized: true, loading: false });
			}

			if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
				if (session?.user) {
					const user = session.user;
					authStore._update({
						user: user,
						profile: currentState.profile?.auth_id === user.id ? currentState.profile : null,
						loading: true,
						error: null
					});

					// Fetch profile directly
					const latestState = get(authStore);
					if (latestState.user?.id === user.id && !latestState.profile) {
						const profile = await fetchProfile(user);
						authStore._update({
							profile: profile || null,
							loading: false,
							error: profile ? null : 'Failed to fetch profile'
						});
					} else if (latestState.user?.id === user.id) {
						authStore._update({ loading: false }); // Profile already loaded or fetch failed
					}
				} else {
					// Event received without session/user - treat as logged out
					console.warn(`[AuthStore] ${event} event received without session/user.`);
					authStore.reset(); // Reset state if session/user is null
				}
			} else if (event === 'SIGNED_OUT') {
				authStore.reset();
			} else if (event === 'USER_UPDATED' && session?.user) {
				authStore._update({ user: session.user });
			}
		});
	} else {
		console.error('[AuthStore] Failed to initialize Supabase browser client.');
		authStore._update({ loading: false, initialized: true, error: 'Supabase client init failed' });
	}
}
