import { getOwnedCards, type OwnedCard } from '#helpers/catalogue-data.ts';
import type { BinderCard, BinderOwnedPayload } from '#lib/types.js';
import type { RequestHandler } from './$types';

const toBinderCard = ({ cardCode, image, language, localId, name, price, rarity, setId, setName, types }: OwnedCard): BinderCard => ({
	cardCode, image, language, localId, name, price, rarity, setId, setName, types,
});

/**
 * The viewer's collection and wishlist, resolved in the three catalogues. Through `locals.supabase`: `owned_cards` is security invoker and
 * row level security keeps a private list to its owner (rule 5). The route is not in `PUBLIC_ROUTES`, which is what resolves the session.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.profile) return Response.json({ error: 'Sign in to read your cards' }, { status: 401 });

	const [collection, wishlist] = await Promise.all([
		getOwnedCards(locals.supabase, locals.profile.username, 'collection'),
		getOwnedCards(locals.supabase, locals.profile.username, 'wishlist'),
	]);

	return Response.json({ collection: collection.cards.map(toBinderCard), wishlist: wishlist.cards.map(toBinderCard) } satisfies BinderOwnedPayload, {
		headers: { 'cache-control': 'private, no-store' },
	});
};
