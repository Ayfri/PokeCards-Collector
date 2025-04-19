import { supabase } from '../supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { authStore } from '../stores/auth';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Types
export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// Flag to prevent multiple refresh attempts
let isRefreshing = false;

// Refresh the session token
export async function refreshToken(): Promise<{ session: Session | null, error: AuthError | null }> {
  if (isRefreshing) {
    // Prevent concurrent refreshes
    return { session: null, error: null };
  }

  isRefreshing = true;
  try {
    console.log('Refreshing authentication token...');

    // Try to refresh the session using Supabase client
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Failed to refresh token:', error);
      return { session: null, error };
    }

    console.log('Token refreshed successfully');

    // If we got a new session, update the auth store
    if (data.session) {
      // Get the user profile
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_id', data.user.id)
          .single();

        // Update the auth store
        authStore.setUser(data.user);
        authStore.setProfile(profile || null);
      }

      // Store the refreshed token in localStorage
      try {
        const tokenData = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          user: data.user
        };

        localStorage.setItem('supabase.auth.token', JSON.stringify(tokenData));
      } catch (storageError) {
        console.error('Error storing refreshed token:', storageError);
      }
    }

    return { session: data.session, error: null };
  } catch (error) {
    console.error('Exception during token refresh:', error);
    return {
      session: null,
      error: {
        name: 'RefreshError',
        message: 'Unknown error refreshing token'
      } as AuthError
    };
  } finally {
    isRefreshing = false;
  }
}

// Check if the session is expired or about to expire
export function isSessionExpired(session: Session | null): boolean {
  if (!session || !session.expires_at) {
    return true;
  }

  // Check if the session is expired or will expire in the next 5 minutes
  const expiryTime = session.expires_at * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;

  return currentTime > (expiryTime - fiveMinutesInMs);
}

// Sign up a new user
export async function signUp(email: string, password: string, username: string): Promise<AuthResponse> {
  try {
    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { user: null, session: null, error: authError };
    }

    if (!authData.user) {
      return {
        user: null,
        session: null,
        error: {
          name: 'UserCreationError',
          message: 'User could not be created'
        } as AuthError
      };
    }

    // 2. Create a profile for the user using service_role (bypasses RLS)
    // NOTE: In a production app, you would typically do this on the server
    // or in a Supabase Function, not the client
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        username,
        auth_id: authData.user.id,
        is_public: true,
      })
      .select()
      .single();

    if (profileError) {
      return {
        user: null,
        session: null,
        error: {
          name: 'ProfileCreationError',
          message: profileError.message
        } as AuthError
      };
    }

    return { user: authData.user, session: authData.session, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      user: null,
      session: null,
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred during sign up'
      } as AuthError
    };
  }
}

// Sign in a user
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // Définir une promesse avec timeout pour éviter les blocages
    const timeoutPromise = new Promise<AuthResponse>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Login timeout: Connection took too long'));
      }, 10000); // 10 secondes
    });

    const authPromise = new Promise<AuthResponse>(async (resolve) => {
      try {
        const supabaseUrl = PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

        // Tenter la connexion via l'API REST directement (contourne certains problèmes CORS)
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              password
            })
          });

          if (!response.ok) {
            // Fallback au client Supabase
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) {
              resolve({
                user: null,
                session: null,
                error: signInError
              });
              return;
            }

            resolve({
              user: signInData?.user || null,
              session: signInData?.session || null,
              error: null
            });
            return;
          }

          // Succès avec fetch direct
          const authData = await response.json();

          const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${authData.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!userResponse.ok) {
            // Store token even if user fetch fails, session is valid
            localStorage.setItem('supabase.auth.token', JSON.stringify(authData));
            resolve({
              user: null,
              session: {
                access_token: authData.access_token,
                refresh_token: authData.refresh_token,
                expires_at: authData.expires_at,
                expires_in: authData.expires_in,
                token_type: authData.token_type,
                provider_token: authData.provider_token,
                provider_refresh_token: authData.provider_refresh_token
              } as Session,
              error: null
            });
            return;
          }

          const userData = await userResponse.json();

          // Construct session object
          const session: Session = {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            expires_at: authData.expires_at,
            expires_in: authData.expires_in,
            token_type: authData.token_type,
            user: userData,
            provider_token: authData.provider_token,
            provider_refresh_token: authData.provider_refresh_token
          };

          // Save session to localStorage
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));

          resolve({
            user: userData,
            session: session,
            error: null
          });
        } catch (fetchError) {
          resolve({ user: null, session: null, error: { name: 'FetchError', message: 'Failed to fetch during sign in' } as AuthError });
        }
      } catch (innerError) {
        resolve({ user: null, session: null, error: { name: 'SignInError', message: 'An unexpected error occurred during sign in' } as AuthError });
      }
    });

    // Utiliser une race entre la promesse d'authentification et le timeout
    return await Promise.race([authPromise, timeoutPromise]);
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      session: null,
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred during sign in'
      } as AuthError
    };
  }
}

// Sign out the current user
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    // Supprimer le token du localStorage
    localStorage.removeItem('supabase.auth.token');

    // Reset local auth state
    authStore.reset();

    let error = null;

    try {
      // Essayer également la méthode Supabase standard
      const result = await supabase.auth.signOut();
      error = result.error;
    } catch (e) {
      // Ignorer les erreurs de déconnexion
    }

    // Always reload, even if there was an error
    setTimeout(() => window.location.reload(), 100);

    return { error };
  } catch (error) {
    // Même en cas d'erreur globale, on tente de recharger la page
    setTimeout(() => window.location.reload(), 100);

    return {
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred during sign out'
      } as AuthError
    };
  }
}

// Get the current session
export async function getSession(): Promise<{ session: Session | null, error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { session: null, error };
    }

    // Check if the session needs to be refreshed
    if (data.session && isSessionExpired(data.session)) {
      console.log('Session is expired or about to expire, refreshing...');
      return await refreshToken();
    }

    return { session: data.session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return {
      session: null,
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred while getting session'
      } as AuthError
    };
  }
}

// Get the current user
export async function getCurrentUser(): Promise<{ user: User | null, error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      user: null,
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred while getting user'
      } as AuthError
    };
  }
}
