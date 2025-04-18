import { supabase } from '../supabase';
import type { UserProfile } from '../types';

// Créer un nouveau profil (à utiliser par l'API d'inscription)
export async function createProfile(username: string, authId: string) {
  try {
    const normalizedUsername = username.toLowerCase(); // Normalize username
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        username: normalizedUsername, // Store normalized username
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

// Get user profile by username (case-insensitive)
export async function getProfileByUsername(username: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username) // Use ilike for case-insensitive match
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
    // Utiliser directement le client supabase
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_public: isPublic })
      .eq('username', username)
      .select()
      .single();
    
    if (error) {
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Check if username is already taken (case-insensitive)
export async function isUsernameTaken(username: string) {
  try {
    const checkPromise = new Promise(async (resolve) => {
      try {
        const normalizedUsername = username.toLowerCase(); // Normalize to lowercase
        // Utiliser le client supabase importé plutôt que d'accéder aux variables d'environnement
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', normalizedUsername) // Compare with normalized username
          .limit(1);
        
        if (supabaseError) {
          resolve({ 
            exists: false, 
            error: supabaseError 
          });
          return;
        }
        
        const exists = Array.isArray(data) && data.length > 0;
        
        resolve({ exists, error: null });
      } catch (error) {
        resolve({ exists: false, error });
      }
    });
    
    // Ajouter un timeout pour éviter les attentes infinies
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout checking username'));
      }, 5000);
    });
    
    return Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    return { exists: false, error };
  }
} 