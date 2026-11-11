import { deleteBinderShare } from '#lib/services/binder-shares.ts';
import type { RequestHandler } from './$types';

/**
 * Unpublishes a share. Row level security turns another user's id into a no-op, so a 404 says nothing the public select does not.
 * The `binderShare` matcher answers the router's 404 to anything that is not a share id. The route is not in `PUBLIC_ROUTES`, which is what resolves the session.
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.profile) return Response.json({ error: 'Sign in to unpublish a binder.' }, { status: 401 });

	const { data, error } = await deleteBinderShare(locals.supabase, params.id);
	if (error || !data) {
		console.error('Binder share delete failed:', error);
		return Response.json({ error: 'The binder could not be unpublished. Try again later.' }, { status: 500 });
	}

	return data.deleted ? new Response(null, { status: 204 }) : Response.json({ error: 'No such share.' }, { status: 404 });
};
