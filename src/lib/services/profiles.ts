import { supabase } from '../supabase';
import type { UserProfile } from '../types';

// Créer un nouveau profil (à utiliser par l'API d'inscription)
export async function createProfile(username: string, authId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        username,
        auth_id: authId,
        is_public: true
      })
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { data: null, error };
  }
}

// Get user profile by auth ID
export async function getProfileByAuthId(authId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', authId)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error getting profile:', error);
    return { data: null, error };
  }
}

// Get user profile by username
export async function getProfileByUsername(username: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error getting profile by username:', error);
    return { data: null, error };
  }
}

// Update user profile
export async function updateProfile(username: string, profileData: Partial<UserProfile>) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('username', username)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { data: null, error };
  }
}

// Toggle profile visibility (public/private)
export async function toggleProfileVisibility(username: string, isPublic: boolean) {
  try {
    console.log('[toggleProfileVisibility] Starting for:', username, 'new state:', isPublic ? 'public' : 'private');
    
    // Get auth token from localStorage if available
    let authToken = null;
    try {
      const tokenString = localStorage.getItem('supabase.auth.token');
      if (tokenString) {
        const tokenData = JSON.parse(tokenString);
        authToken = tokenData.access_token;
        console.log('[toggleProfileVisibility] Auth token found in localStorage');
      }
    } catch (e) {
      console.error('[toggleProfileVisibility] Error retrieving token:', e);
    }
    
    // Use direct fetch for better control
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[toggleProfileVisibility] Missing Supabase environment variables');
      return { data: null, error: new Error('Missing Supabase environment variables') };
    }
    
    console.log('[toggleProfileVisibility] URL:', `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}`);
    
    // Prepare headers
    const headers: Record<string, string> = {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    
    // Add Authorization header if token is available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Make the request
    console.log('[toggleProfileVisibility] Sending request with headers:', headers);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_public: isPublic })
      }
    );
    
    // Log full response
    console.log('[toggleProfileVisibility] Response status:', response.status);
    console.log('[toggleProfileVisibility] Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error('[toggleProfileVisibility] Request error:', response.status, errorText);
      return { 
        data: null, 
        error: new Error(`Error ${response.status}: ${errorText}`) 
      };
    }
    
    // Parse response
    let data;
    try {
      data = await response.json();
      console.log('[toggleProfileVisibility] Response data:', data);
    } catch (parseError) {
      console.error('[toggleProfileVisibility] Error parsing JSON response:', parseError);
      return { 
        data: null, 
        error: new Error('Error parsing server response') 
      };
    }
    
    // Return the first item of the array (should be only one)
    if (Array.isArray(data) && data.length > 0) {
      return { data: data[0], error: null };
    } else {
      return { data: null, error: new Error('No profile returned from update') };
    }
  } catch (error) {
    console.error('[toggleProfileVisibility] Exception:', error);
    return { data: null, error };
  }
}

// Check if username is already taken
export async function isUsernameTaken(username: string) {
  try {
    console.log('[isUsernameTaken] Vérification pour username:', username);
    
    // Utiliser fetch directement au lieu de créer un client Supabase
    // Cela évite les problèmes avec "Multiple GoTrueClient instances"
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[isUsernameTaken] Variables d\'environnement Supabase manquantes');
      return { exists: false, error: new Error('Variables d\'environnement Supabase manquantes') };
    }
    
    // Requête REST directe
    console.log('[isUsernameTaken] Envoi de la requête REST...');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=username`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[isUsernameTaken] Erreur de la requête:', response.status, errorText);
      return { 
        exists: false, 
        error: new Error(`Erreur ${response.status}: ${errorText}`) 
      };
    }
    
    const data = await response.json();
    console.log('[isUsernameTaken] Réponse:', data);
    
    const exists = Array.isArray(data) && data.length > 0;
    console.log('[isUsernameTaken] Username existe:', exists);
    
    return { exists, error: null };
  } catch (error) {
    console.error('[isUsernameTaken] Exception:', error);
    return { exists: false, error };
  }
} 