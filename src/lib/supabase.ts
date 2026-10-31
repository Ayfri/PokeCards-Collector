import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { browser } from '$app/environment';

/**
 * Anonymous client, no session attached. Reserved for the public catalogue (`cards`, `prices`, `sets`, ...),
 * never for a row whose policy gates on `auth.uid()`.
 *
 * The auth options are what make that true. `detectSessionInUrl` defaults to on, and since this module is
 * pulled in by `LoginForm`, that had every page in the site silently claim any token left in the URL fragment
 * and stash it in `localStorage`, out of reach of the cookie session the server reads.
 */
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

let browserClient: SupabaseClient | null = null;

/**
 * The session-carrying client. It reads the same auth cookies `hooks.server.ts` writes, so `auth.uid()`
 * resolves inside Postgres and the `collections` / `wishlists` / `profiles` policies apply to the right user.
 * Server code has no ambient session and must pass `locals.supabase` explicitly instead.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
	if (!browser) {
		throw new Error('getSupabaseBrowserClient() is browser-only, server code must pass locals.supabase.');
	}

	browserClient ??= createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
	return browserClient;
}
