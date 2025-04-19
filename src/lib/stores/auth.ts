import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { UserProfile } from '../types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { browser } from '$app/environment';

// Define types
interface AuthState {
	user: User | null;
	profile: UserProfile | null;
	loading: boolean;
	error: string | null;
}

// Create initial state
const initialState: AuthState = {
	user: null,
	profile: null,
	loading: true,
	error: null
};

// Create the store
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		setUser: (user: User | null) => update(state => ({ ...state, user })),
		setProfile: (profile: UserProfile | null) => update(state => ({ ...state, profile })),
		setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
		setError: (error: string | null) => update(state => ({ ...state, error })),
		reset: () => set(initialState),

		// Initialize auth state from Supabase session or localStorage
		init: async () => {
			try {
				update(state => ({ ...state, loading: true, error: null }));

				// Vérifier d'abord le localStorage pour le token (uniquement côté client)
				let tokenString: string | null = null;
				if (browser) {
					tokenString = localStorage.getItem('supabase.auth.token');
				}

				if (tokenString) {
					try {
						const tokenData = JSON.parse(tokenString);

						// Extraire les informations utilisateur du token (si disponibles)
						if (tokenData.access_token) {
							// Le token existe, essayons de récupérer le profil utilisateur
							// Créer un client temporaire avec le token
							const { createClient } = await import('@supabase/supabase-js');
							const supabaseUrl = PUBLIC_SUPABASE_URL;
							const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

							const tempClient = createClient(supabaseUrl, supabaseAnonKey);

							// Essayer de récupérer l'utilisateur
							const { data: userData, error: userError } = await tempClient.auth.getUser(tokenData.access_token);

							if (!userError && userData.user) {
								// Récupérer le profil
								const response = await fetch(
									`${supabaseUrl}/rest/v1/profiles?auth_id=eq.${userData.user.id}&select=*`,
									{
										headers: {
											'apikey': supabaseAnonKey,
											'Authorization': `Bearer ${tokenData.access_token}`,
											'Content-Type': 'application/json'
										}
									}
								);

								if (response.ok) {
									const profiles = await response.json();
									const profile = profiles.length > 0 ? profiles[0] : null;

									if (profile) {
										update(state => ({
											...state,
											user: userData.user,
											profile,
											loading: false
										}));
										return;
									}
								}
							}
						}
					} catch (tokenError) {
						// Ignorer les erreurs de token et continuer avec la méthode standard
					}
				}

				// Essayer avec la méthode Supabase standard comme fallback
				const { data: { session } } = await supabase.auth.getSession();

				if (session) {
					// Get user
					const { data: { user } } = await supabase.auth.getUser();

					// Get profile
					if (user) {
						const { data: profile } = await supabase
							.from('profiles')
							.select('*')
							.eq('auth_id', user.id)
							.single();

						update(state => ({ ...state, user, profile, loading: false }));
					} else {
						update(state => ({ ...state, user: null, profile: null, loading: false }));
					}
				} else {
					update(state => ({ ...state, user: null, profile: null, loading: false }));
				}
			} catch (error) {
				update(state => ({
					...state,
					user: null,
					profile: null,
					loading: false,
					error: 'Failed to initialize authentication'
				}));
			}
		}
	};
}

// Export the store
export const authStore = createAuthStore();

// Set up Supabase auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
	if (event === 'SIGNED_IN' && session) {
		// Get user
		const { data: { user } } = await supabase.auth.getUser();

		// Get profile
		if (user) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('*')
				.eq('auth_id', user.id)
				.single();

			authStore.setUser(user);
			authStore.setProfile(profile || null);
		}
	} else if (event === 'SIGNED_OUT') {
		authStore.reset();
	}
});
