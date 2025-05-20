import { error, redirect } from '@sveltejs/kit';
import { getPokemons, getRarities, getTypes, getArtists } from '$helpers/data';
import { getProfileByUsername } from '$lib/services/profiles';
import { getUserCollection } from '$lib/services/collections';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile, UserCollection } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent(); // Await parent data first

	// Destructure non-streamed properties and the streamed object
	const { profile: loggedInUserProfile, sets: parentSets, collectionItems: layoutCollectionItems, ...layoutData } = parentData;

	// Await streamed properties
	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const sets = parentSets || []; // Use parentSets, assuming it's already resolved

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
			let itemsToProcess: Array<{ card_code: string }> | undefined | null = layoutCollectionItems as Array<{ card_code: string }> | undefined | null;

			// If viewing another user's public profile, fetch their collection items
			if (isPublic && loggedInUserProfile?.username !== targetProfile.username && targetProfile) {
				const { data: targetUserCollectionItems, error: collectionError } = await getUserCollection(targetProfile.username);
				if (collectionError) {
					console.error(`Error fetching collection for ${targetProfile.username}:`, collectionError);
					itemsToProcess = [];
				} else {
					itemsToProcess = targetUserCollectionItems;
				}
			} else if (loggedInUserProfile && loggedInUserProfile.username === targetProfile?.username) {
				// Viewing own collection, use layout data
				itemsToProcess = layoutCollectionItems as Array<{ card_code: string }> | undefined | null;
			} else if (!isPublic && !(loggedInUserProfile && loggedInUserProfile.username === targetProfile?.username)) {
				// Private profile and not the owner
				itemsToProcess = [];
			}

			if (itemsToProcess) {
				const collectionCardCodes = new Set(itemsToProcess.map(item => item.card_code));
				collectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
			} else {
				collectionCards = []; // Default to empty if no items found or error
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
		allCards,
		pokemons,
		sets,
		rarities,
		types,
		prices,
		artists,
		targetProfile,
		isPublic,
		serverCollectionCards: collectionCards,
		targetUsername,
		title,
		description,
		image: ogImage,
	};
};
