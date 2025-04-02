import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password, username } = await request.json();
    
    console.log('Inscription demandée pour:', { email, username });
    
    // Validation de base
    if (!email || !password || !username) {
      console.log('Erreur: champs manquants');
      return json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // 1. Création d'un client Supabase avec les privilèges d'administrateur
    // Utilise la clé secrète du serveur qui contourne les politiques RLS
    const supabaseAdmin = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Vérification si le nom d'utilisateur existe déjà
    console.log('Vérification du nom d\'utilisateur...');
    const { data: existingUser, error: usernameCheckError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username);
    
    if (usernameCheckError) {
      console.log('Erreur vérification username:', usernameCheckError);
      return json({
        success: false,
        error: 'Error checking username availability'
      }, { status: 500 });
    }
    
    if (existingUser && existingUser.length > 0) {
      console.log('Nom d\'utilisateur déjà pris');
      return json({
        success: false,
        error: 'Username already taken'
      }, { status: 400 });
    }
    
    // 2. Créer l'utilisateur
    console.log('Création de l\'utilisateur...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Confirme automatiquement l'email
    });
    
    if (authError) {
      console.log('Erreur création utilisateur:', authError);
      return json({ 
        success: false, 
        error: authError.message 
      }, { status: 400 });
    }
    
    if (!authData.user) {
      console.log('Utilisateur non créé');
      return json({ 
        success: false, 
        error: 'User could not be created' 
      }, { status: 500 });
    }
    
    console.log('Utilisateur créé avec succès:', authData.user.id);
    
    // 3. Créer le profil pour l'utilisateur
    console.log('Création du profil...');
    try {
      // Utiliser supabaseAdmin pour s'assurer que RLS est contourné
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          username,
          auth_id: authData.user.id,
          is_public: true,
          avatar_url: null, // S'assurer que tous les champs requis sont présents
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.log('Erreur création profil:', profileError);
        // Si la création du profil échoue, supprimer l'utilisateur pour éviter des utilisateurs orphelins
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        
        return json({ 
          success: false, 
          error: `Profile creation failed: ${profileError.message}` 
        }, { status: 500 });
      }
    } catch (insertError: any) {
      console.log('Exception lors de l\'insertion du profil:', insertError);
      // En cas d'erreur, supprimer l'utilisateur
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return json({ 
        success: false, 
        error: `Profile creation error: ${insertError.message}` 
      }, { status: 500 });
    }
    
    console.log('Profil créé avec succès');
    
    // Tout s'est bien passé
    return json({ 
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}; 