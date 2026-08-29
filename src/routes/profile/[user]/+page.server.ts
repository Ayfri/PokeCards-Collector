import { getCards, getPrices } from '$helpers/supabase-data';
import { redirect } from '@sveltejs/kit';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import { breadcrumbs, profileSchema } from '$helpers/seo';
import type { CollectionStats } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { profile: loggedInUserProfile, sets } = await parent();

	const requestedUsername = params.user;
	const isOwnProfile = loggedInUserProfile?.username === requestedUsername;

	const { data: targetProfile, error: profileError } = await getProfileByUsername(requestedUsername, locals.supabase);
	if (profileError || !targetProfile) redirect(307, '/');

	// Usernames resolve case-insensitively, so send both the browser and the crawler to the stored casing.
	if (targetProfile.username !== requestedUsername) redirect(307, `/profile/${encodeURIComponent(targetProfile.username)}`);

	const isPublic = targetProfile.is_public;
	let collectionStats: CollectionStats | null = null;
	let totalCards = 0;
	let title = 'Private Profile';
	let description = `This user's profile is private.`;

	if (isPublic || isOwnProfile) {
		// The catalogue only feeds the stats computation, it is never returned: 23546 cards in the document for a card count.
		const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
		totalCards = allCards.length;

		const { data: stats, error: statsError } = await getCollectionStats(targetProfile.username, allCards, sets, prices, locals.supabase);
		if (statsError) console.error(`Error fetching collection stats for ${targetProfile.username}:`, statsError);
		else collectionStats = stats;

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
		// A private profile must never reach an index: the crawler would otherwise store the "private profile" shell under a real username.
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
