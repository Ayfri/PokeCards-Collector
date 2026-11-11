import { MAX_SHARES_PER_USER, parseShareInput } from '#helpers/binder.ts';
import { createBinderShare, listBinderShares } from '#lib/services/binder-shares.ts';
import type { RequestHandler } from './$types';

/** A valid body is under 60 kB of codes plus the name: anything above this is refused before it is read, whatever the validation would say. */
const MAX_BODY_BYTES = 128_000;

/**
 * The owner's own shares, newest first. The table is public read, so the service filters on the username: the list is what lets a user unpublish
 * a share whose id this browser lost. The route is not in `PUBLIC_ROUTES`, which is what resolves the session.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.profile) return Response.json({ error: 'Sign in to see your shared binders.' }, { status: 401 });

	const { data, error } = await listBinderShares(locals.supabase, locals.profile.username);
	if (!data) {
		console.error('Binder shares list failed:', error);
		return Response.json({ error: 'Your shared binders could not be loaded. Try again later.' }, { status: 500 });
	}

	return Response.json({ shares: data }, { headers: { 'cache-control': 'private, no-store' } });
};

/**
 * Publishes a snapshot of one binder. The insert goes through `locals.supabase`, so row level security and the table's check constraints
 * are the real guard: the validation here only turns the common failures into readable errors. The route is not in `PUBLIC_ROUTES`,
 * which is what resolves the session.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.profile) return Response.json({ error: 'Sign in to share a binder.' }, { status: 401 });
	if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return Response.json({ error: 'This binder is too large to share. Split it into smaller binders.' }, { status: 413 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'The request body must be JSON.' }, { status: 400 });
	}

	const input = parseShareInput(body);
	if (typeof input === 'string') return Response.json({ error: input }, { status: 400 });

	const { data, error } = await createBinderShare(locals.supabase, locals.profile.username, input);
	if (data) return Response.json({ id: data.id }, { status: 201 });

	console.error('Binder share insert failed:', error);
	const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
	/** `42501` is the insert policy refusing: the cap of shares per user is the only thing it can refuse for the owner of the profile. */
	if (code === '42501') return Response.json({ error: `You can share up to ${MAX_SHARES_PER_USER} binders. Unpublish one first.` }, { status: 403 });
	/** `23514` is any check violation (name, shape, size): the validation above already reports the size, so what reaches here has no better message. */
	if (code === '23514') return Response.json({ error: 'This binder cannot be shared as it is.' }, { status: 422 });
	return Response.json({ error: 'The binder could not be shared. Try again later.' }, { status: 500 });
};
