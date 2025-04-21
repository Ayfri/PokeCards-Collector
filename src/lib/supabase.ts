import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
// Removed browser import as standard module caching should handle singleton

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Supabase URL or Anon Key is missing. Check your environment variables.');
	// Throw an error or handle appropriately if keys are missing
	// For now, let createClient handle potential errors if called with undefined
}

// Create the Supabase client - This ensures it runs only once when the module is first imported.
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
