import { redirect, type RequestHandler } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';

const OTP_TYPES: readonly EmailOtpType[] = ['email', 'email_change', 'invite', 'magiclink', 'recovery', 'signup'];

/** Only a same-origin path is followed, so a crafted `next` cannot bounce a freshly authenticated user off-site. */
const safePath = (next: string | null): string => (next?.startsWith('/') && !next.startsWith('//') ? next : '/');

const withError = (path: string, origin: string, code: string): string => {
	const target = new URL(path, origin);
	target.searchParams.set('auth_error', code);
	return `${target.pathname}${target.search}`;
};

/**
 * Trades the one-time `token_hash` of an email link for a session. The exchange runs on `locals.supabase`, so
 * `hooks.server.ts` writes the auth cookies onto this very response and every later server load sees the user.
 * The link carries a hash rather than an access token, and it is spent here rather than in the browser.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const next = safePath(url.searchParams.get('next'));

	if (!tokenHash || !type || !OTP_TYPES.includes(type)) {
		redirect(303, withError(next, url.origin, 'invalid_link'));
	}

	const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });

	if (error) {
		console.error(`Email link verification failed (${type}):`, error.message);
		redirect(303, withError(next, url.origin, 'expired_link'));
	}

	redirect(303, next);
};
