import { error, redirect } from '@sveltejs/kit';
import { getPokemons, getRarities, getTypes, getArtists } from '$helpers/data';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { allCards, sets, prices, profile: loggedInUserProfile, collectionItems: layoutCollectionItems, ...layoutData } = await parent();
	const requestedUsername = params.user;

	// --- Load remaining base data --- 
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]).catch(e => {
		console.error("Error loading page-specific card data:", e);
		throw error(500, 'Failed to load necessary card data for page');
	});
	// --- End base data loading ---

	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = null;
	let isPublic = false;
	let collectionCards: FullCard[] | null = null;
	let title = 'Collection';
	let description = 'User collection';
	let profileError: any = null;

	targetUsername = requestedUsername;
	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
		console.error(`Error fetching profile or profile not found for ${targetUsername}:`, profileError);
		targetProfile = null;
		title = 'User Not Found';
		description = `Collection for user ${targetUsername} could not be found or user does not exist.`;
	} else {
		if (targetProfile.username !== targetUsername) {
			const correctUrl = `/collection/${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}
		targetUsername = targetProfile.username;
		isPublic = targetProfile.is_public;

		if (isPublic || (loggedInUserProfile && loggedInUserProfile.username === targetProfile.username)) {
			// Use collectionItems from layout data
			if (layoutCollectionItems) {
				const collectionCardCodes = new Set(layoutCollectionItems.map(item => item.card_code));
				collectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
			} else {
				collectionCards = []; // Or handle as error if items were expected
			}
			title = `${targetProfile.username}'s Collection`;
			description = `Pokémon TCG collection for user ${targetProfile.username}.`;
		} else {
			title = 'Private Collection';
			description = `This user's collection is private.`;
		}
	}

	if (loggedInUserProfile && loggedInUserProfile.username === targetUsername) {
		title = 'My Collection';
		description = 'Your Pokémon TCG card collection.';
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		...layoutData,
		allCards, pokemons, sets, rarities, types, prices, artists,
		targetProfile, 
		isPublic,
		serverCollectionCards: collectionCards,
		targetUsername,
		title,
		description,
		image: ogImage,
	};
}; 