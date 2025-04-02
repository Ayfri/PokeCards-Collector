import { supabase } from '../supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { authStore } from '../stores/auth';

// Types
export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { 
      user: data?.user || null, 
      session: data?.session || null, 
      error 
    };
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
    console.log('Token supprimé du localStorage');
    
    // Reset local auth state
    authStore.reset();
    console.log('Auth store reset');
    
    let error = null;
    
    try {
      // Essayer également la méthode Supabase standard
      const result = await supabase.auth.signOut();
      error = result.error;
      console.log('Supabase signOut', error ? 'error: ' + error.message : 'succès');
    } catch (e) {
      console.error('Erreur lors de supabase.auth.signOut():', e);
    }
    
    // Always reload, even if there was an error
    console.log('Rechargement de la page...');
    setTimeout(() => window.location.reload(), 100);
    
    return { error };
  } catch (error) {
    console.error('Sign out error:', error);
    
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
    return { session: data.session, error };
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