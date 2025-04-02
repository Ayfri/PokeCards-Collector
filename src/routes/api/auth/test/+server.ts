import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

// Endpoint de test simple pour vérifier que l'API fonctionne
export const GET: RequestHandler = async () => {
  try {
    // Récupérer les variables d'environnement
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
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
    
    // Test de connexion directe avec fetch
    let fetchResult: any = null;
    let fetchError = null;
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          'apikey': supabaseAnonKey
        }
      });
      
      fetchResult = {
        status: response.status,
        ok: response.ok
      };
      
      if (response.ok) {
        fetchResult.data = await response.json();
      }
    } catch (error) {
      fetchError = error instanceof Error ? error.message : String(error);
    }
    
    // Test avec le client
    let clientResult = null;
    let clientError = null;
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        clientError = error.message;
      } else {
        clientResult = { data };
      }
    } catch (error) {
      clientError = error instanceof Error ? error.message : String(error);
    }
    
    return json({ 
      success: true, 
      message: 'API test endpoint fonctionne!',
      timestamp: new Date().toISOString(),
      supabase_config: {
        url: supabaseUrl.substring(0, 15) + '...',
        key_defined: !!supabaseAnonKey
      },
      fetch_test: {
        result: fetchResult,
        error: fetchError
      },
      client_test: {
        result: clientResult,
        error: clientError
      }
    });
  } catch (error) {
    return json({
      success: false,
      error: 'Server error while testing Supabase connection',
      error_details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

// Endpoint de test qui accepte des données
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Test spécial pour vérifier la connexion à Supabase
    if (data.action === 'check_supabase') {
      try {
        // Créer un client Supabase
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
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
    
    // Test spécial pour vérifier la clé service role
    if (data.action === 'check_service_role') {
      try {
        // Vérifier que la clé service role est définie
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
          return json({
            success: false,
            error: 'Variables d\'environnement pour la clé service role manquantes',
            config: { 
              hasUrl: !!supabaseUrl, 
              hasServiceKey: !!supabaseServiceKey 
            }
          });
        }
        
        // Créer un client admin avec la clé service role
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Tester la connexion et les permissions en faisant une requête simple
        const { data: testData, error: testError } = await supabaseAdmin
          .from('profiles')
          .select('count(*)')
          .limit(1);
        
        if (testError) {
          return json({
            success: false,
            error: 'Erreur d\'accès avec la clé service role',
            details: testError
          });
        }
        
        // Si le test de base passe, tester les permissions admin
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'Password123';
        
        // Essayer de créer un utilisateur de test (mais ne pas terminer la création)
        const { data: authQueryData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1
        });
        
        if (authError) {
          return json({
            success: false,
            error: 'La clé service role n\'a pas les permissions admin requises',
            details: authError
          });
        }
        
        return json({
          success: true,
          message: 'La clé service role fonctionne correctement et a les permissions nécessaires',
          data: { 
            dbAccessOk: true,
            adminRightsOk: true,
            usersCount: authQueryData?.users?.length || 0
          }
        });
      } catch (serviceKeyError) {
        console.error('Erreur test service role:', serviceKeyError);
        return json({
          success: false,
          error: 'Exception lors du test de la clé service role',
          details: serviceKeyError instanceof Error ? serviceKeyError.message : 'Erreur inconnue'
        });
      }
    }
    
    // Test spécial pour vérifier si un username existe
    if (data.action === 'check_username' && data.username) {
      try {
        // Créer un client Supabase
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
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