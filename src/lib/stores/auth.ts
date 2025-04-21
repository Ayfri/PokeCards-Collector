import { writable, get } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
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
	if (!user) return null;
	try {
		const { data: profile, error } = await supabase
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
	supabase.auth.onAuthStateChange(async (event, session) => {
		const currentState = get(authStore);

		if (!currentState.initialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
			// Mark as initialized on the first relevant event to sync loading state
			authStore._update({ initialized: true, loading: false }); // Set loading false once initialized
		}

		if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
			if (session?.user) {
				const user = session.user;
				// Update user state immediately, profile might follow
				authStore._update({
					user: user,
					profile: currentState.profile?.auth_id === user.id ? currentState.profile : null, // Keep profile if user is same
					loading: true, // Set loading true while potentially fetching profile
					error: null
				});

				// Decouple profile fetch from the auth callback using setTimeout
				// This seems necessary to prevent hangs in certain environments/timings.
				setTimeout(async () => {
					const latestState = get(authStore);
					// Only fetch if the user is still the same and profile hasn't been loaded
					if (latestState.user?.id === user.id && !latestState.profile) {
						const profile = await fetchProfile(user);
						authStore._update({
							// User should still be set
							profile: profile || null,
							loading: false,
							error: profile ? null : 'Failed to fetch profile'
						});
					} else if (latestState.user?.id === user.id) {
						// User is correct, profile already loaded or fetch wasn't needed
						authStore._update({ loading: false });
					}
					// If user changed before timeout, do nothing
				}, 0);

			} else {
				// Event received without session/user - treat as logged out
				console.warn(`[AuthStore] ${event} event received without session/user.`);
				authStore.reset();
			}
		} else if (event === 'SIGNED_OUT') {
			authStore.reset();
		} else if (event === 'USER_UPDATED' && session?.user) {
			// If user email/phone etc. changes, update it.
			// Profile might need re-fetching depending on what can change.
			authStore._update({ user: session.user });
		}
	});
}
