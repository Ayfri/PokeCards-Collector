import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Récupérer les valeurs des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Créer le client Supabase
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  // En cas d'erreur d'initialisation, créer un client par défaut
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase }; 