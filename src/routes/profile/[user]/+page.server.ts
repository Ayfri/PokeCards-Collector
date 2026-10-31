import { LANGUAGES } from '$helpers/catalogues';
import { countCards, getCatalogue } from '$helpers/supabase-data';
import { redirect } from '@sveltejs/kit';
import { computeCollectionStats } from '$helpers/collection-stats';
import { readOwnedCatalogues } from '$helpers/owned-cards';
import { getUserCollection } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import { getUserWishlist } from '$lib/services/wishlists';
import type { PageServerLoad } from './$types';
import { breadcrumbs, profileSchema } from '$helpers/seo';
import type { CollectionStats } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const requestedUsername = params.user;
	/** The profile lookup runs in parallel with the layout load instead of waiting for it. */
	const profilePromise = getProfileByUsername(requestedUsername, locals.supabase);
	/** Read in parallel with the profile: row level security already hides a private collection, so reading early leaks nothing. */
	const rowsPromise = Promise.all([getUserCollection(requestedUsername, locals.supabase), getUserWishlist(requestedUsername, locals.supabase)]);
	const { profile: loggedInUserProfile } = await parent();
	const isOwnProfile = loggedInUserProfile?.username === requestedUsername;

	const { data: targetProfile, error: profileError } = await profilePromise;
	if (profileError || !targetProfile) redirect(307, '/');

	/** Usernames resolve case-insensitively, so browsers and crawlers are redirected to the stored casing. */
	if (targetProfile.username !== requestedUsername) redirect(307, `/profile/${encodeURIComponent(targetProfile.username)}`);

	const isPublic = targetProfile.is_public;
	let collectionStats: CollectionStats | null = null;
	let totalCards = 0;
	let title = 'Private Profile';
	let description = `This user's profile is private.`;

	if (isPublic || isOwnProfile) {
		const [[{ data: collectionRows, error: collectionError }, { data: wishlistRows, error: wishlistError }], counts] = await Promise.all([rowsPromise, Promise.all(LANGUAGES.map(countCards))]);
		totalCards = counts.reduce((total, count) => total + count, 0);

		if (collectionError || !collectionRows) console.error(`Error fetching collection stats for ${targetProfile.username}:`, collectionError);
		else {
			const wishlist = wishlistError ? [] : wishlistRows ?? [];
			/** The catalogues only feed the stats and are never returned: returning them would put 23546 cards in the document just for a card count. */
			const catalogues = await readOwnedCatalogues([...collectionRows, ...wishlist].map(row => row.card_code), getCatalogue);
			collectionStats = computeCollectionStats(collectionRows, wishlist, catalogues);
		}

		title = isOwnProfile ? 'My Profile' : `${targetProfile.username}'s Pokémon Card Collection`;
		description = collectionStats
			? `${targetProfile.username} owns ${collectionStats.unique_cards} unique Pokémon cards (${collectionStats.total_instances} in total) worth around €${collectionStats.total_value.toFixed(2)} on Cardmarket. Browse the collection, the wishlist and the set completion.`
			: `Pokémon TCG collector profile for ${targetProfile.username}: collection, wishlist and set completion.`;
	}

	return {
		breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }, { name: targetProfile.username, url: `/profile/${targetProfile.username}` }),
		collectionStats,
		description,
		image: { alt: 'PokéCards-Collector logo', height: 436, url: '/favicon.png', width: 485 },
		isOwnProfile,
		isPublic,
		/** A private profile must not be indexed: a crawler would otherwise store the "private profile" shell under a real username. */
		noindex: !isPublic,
		schemas: isPublic
			? [profileSchema(targetProfile, `/profile/${targetProfile.username}`, collectionStats
				? { cards: collectionStats.total_instances, uniqueCards: collectionStats.unique_cards }
				: undefined)]
			: [],
		targetProfile,
		title,
		totalCards,
		type: 'ProfilePage' as const,
	};
};
