import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Récupérer les valeurs des variables d'environnement
const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

// Créer le client Supabase
let supabase: SupabaseClient;
try {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
	// En cas d'erreur d'initialisation, créer un client par défaut
	supabase = createClient(supabaseUrl, supabaseAnonKey);
	console.error('Error initializing Supabase:', error);
}

export { supabase };
