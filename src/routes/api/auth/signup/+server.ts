import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // 1. Récupérer et valider les données
    let userData;
    try {
      userData = await request.json();
    } catch (parseError) {
      return json({ 
        success: false, 
        error: 'Invalid JSON data' 
      }, { status: 400 });
    }
    
    const { email, password, username } = userData;
    
    // Validation de base
    if (!email || !password || !username) {
      return json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // 2. Initialiser le client Supabase admin
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ 
        success: false, 
        error: 'Server configuration error'
      }, { status: 500 });
    }
    
    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    } catch (clientError) {
      return json({ 
        success: false, 
        error: 'Failed to initialize database connection' 
      }, { status: 500 });
    }
    
    // 3. Vérification si le nom d'utilisateur existe déjà
    let existingUser;
    let usernameCheckError;
    
    try {
      const result = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('username', username);
      
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
    
    // 4. Créer l'utilisateur
    let authData;
    let authError;
    
    try {
      // 1. Créer l'utilisateur directement via l'API REST de Supabase
      const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true
        })
      });
      
      if (!createUserResponse.ok) {
        // En cas d'erreur, essayer de lire le corps pour plus de détails
        let errorBody;
        try {
          errorBody = await createUserResponse.json();
        } catch (e) {
          errorBody = { message: 'Unknown error' };
        }
        
        return json({
          success: false,
          error: `Failed to create user: ${errorBody.message || 'Unknown error'}`
        }, { status: createUserResponse.status });
      }
      
      // Lire les données de l'utilisateur créé
      const userData = await createUserResponse.json();
      
      authData = {
        user: userData
      };
      authError = null;
    } catch (createError) {
      // Essayer en fallback avec le client Supabase standard
      try {
        const result = await supabaseAdmin.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
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
    
    // 5. Créer le profil pour l'utilisateur
    
    // Vérifier que authData et authData.user existent
    if (!authData || !authData.user || !authData.user.id) {
      return json({ 
        success: false, 
        error: 'User data missing for profile creation' 
      }, { status: 500 });
    }
    
    try {
      // Utiliser fetch direct au lieu du client Supabase
      const profileData = {
        username,
        auth_id: authData.user.id,
        is_public: true,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(profileData)
      });
      
      if (!profileResponse.ok) {
        // En cas d'erreur, essayer de lire le corps pour plus de détails
        let errorBody;
        try {
          errorBody = await profileResponse.json();
        } catch (e) {
          errorBody = { message: 'Unknown error' };
        }
        
        // Si la création du profil échoue, essayer de supprimer l'utilisateur
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.user.id}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          });
        } catch (deleteError) {
          // Ignorer les erreurs de suppression
        }
        
        return json({ 
          success: false, 
          error: `Profile creation failed: ${errorBody.message || 'Unknown error'}` 
        }, { status: 500 });
      }
    } catch (insertError) {
      // En cas d'erreur, essayer de supprimer l'utilisateur
      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.user.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });
      } catch (deleteError) {
        // Ignorer les erreurs de suppression
      }
      
      return json({ 
        success: false, 
        error: 'Profile creation failed'
      }, { status: 500 });
    }
    
    // Tout s'est bien passé
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