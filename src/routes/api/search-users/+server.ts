import { json } from '@sveltejs/kit';
import { searchUsers } from '$lib/services/profiles';
import type { RequestHandler } from './$types';

/** The RPC counts collection rows per profile it returns, so an uncapped limit turns one anonymous call into a full scrape. */
const MAX_LIMIT = 24;

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q') ?? '';
	const requested = Number(url.searchParams.get('limit'));
	const limit = Number.isFinite(requested) && requested > 0 ? Math.min(Math.trunc(requested), MAX_LIMIT) : 10;

	const { data, error } = await searchUsers(query, limit);

	if (error) {
		console.error('Search users API error:', error);
		return json({ success: false, error: 'Could not search users' }, { status: 500 });
	}

	return json({ success: true, users: data ?? [] });
};
