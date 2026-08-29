import { createClient as createBasicClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { browser } from '$app/environment';
// Removed browser import as standard module caching should handle singleton

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabasePublishableKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
	console.error('Supabase URL or publishable key is missing. Check your environment variables.');
	// Throw an error or handle appropriately if keys are missing
	// For now, let createClient handle potential errors if called with undefined
}

// Create the Supabase client - This ensures it runs only once when the module is first imported.
export const supabase = createBasicClient(supabaseUrl, supabasePublishableKey);

// --- Browser Client Setup (Used by stores/components for SSR compatibility) ---

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton instance of the Supabase browser client.
 * Ensures it's only created in the browser environment.
 */
export function getSupabaseBrowserClient() {
  if (browser && !browserClient) {
    browserClient = createBrowserClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  }
  // On the server, or if already created, return the instance (or null if server)
  return browserClient;
}
