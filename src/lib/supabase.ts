import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Récupérer les valeurs des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ptbwuqaqkqntmgmaqboq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ynd1cWFxa3FudG1nbWFxYm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDk2MDIsImV4cCI6MjA1OTA4NTYwMn0.zHklpHnOAQ1IvdKjoRnUTFIiPmSMiFiIN9_P0NNuqrg';

// Créer le client Supabase
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  // En cas d'erreur d'initialisation, créer un client par défaut
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase }; 