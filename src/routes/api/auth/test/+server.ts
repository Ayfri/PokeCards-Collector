import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

// Endpoint de test simple pour vérifier que l'API fonctionne
export const GET: RequestHandler = async () => {
  return json({ 
    success: true, 
    message: 'API test endpoint fonctionne!',
    timestamp: new Date().toISOString()
  });
};

// Endpoint de test qui accepte des données
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Test spécial pour vérifier la connexion à Supabase
    if (data.action === 'check_supabase') {
      try {
        // Créer un client Supabase
        const supabaseUrl = import.meta.env.SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          return json({
            success: false,
            error: 'Variables d\'environnement Supabase manquantes',
            config: { 
              hasUrl: !!supabaseUrl, 
              hasKey: !!supabaseAnonKey 
            }
          });
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Tester la connexion en faisant une requête simple
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('username')
          .limit(1);
        
        if (testError) {
          return json({
            success: false,
            error: 'Erreur de connexion à Supabase',
            details: testError
          });
        }
        
        return json({
          success: true,
          message: 'Connexion à Supabase réussie',
          data: { count: testData?.length || 0 }
        });
      } catch (supabaseError) {
        console.error('Erreur de connexion Supabase:', supabaseError);
        return json({
          success: false,
          error: 'Exception lors de la connexion à Supabase',
          details: supabaseError instanceof Error ? supabaseError.message : 'Erreur inconnue'
        });
      }
    }
    
    // Test spécial pour vérifier si un username existe
    if (data.action === 'check_username' && data.username) {
      try {
        // Créer un client Supabase
        const supabaseUrl = import.meta.env.SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Vérifier si le username existe
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', data.username);
        
        if (userError) {
          return json({
            success: false,
            error: 'Erreur lors de la vérification du nom d\'utilisateur',
            details: userError
          });
        }
        
        return json({
          success: true,
          exists: userData && userData.length > 0,
          username: data.username
        });
      } catch (usernameError) {
        console.error('Erreur check username:', usernameError);
        return json({
          success: false,
          error: 'Exception lors de la vérification du nom d\'utilisateur',
          details: usernameError instanceof Error ? usernameError.message : 'Erreur inconnue'
        });
      }
    }
    
    return json({
      success: true,
      message: 'Données reçues avec succès',
      receivedData: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur endpoint test:', error);
    return json({
      success: false,
      error: 'Erreur lors du traitement des données',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}; 