import { error, redirect } from '@sveltejs/kit';
import { getPokemons, getRarities, getTypes, getArtists } from '$helpers/data';
import { getProfileByUsername } from '$lib/services/profiles';
import { getUserCollection } from '$lib/services/collections';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile, Set as TSet, PriceData } from '$lib/types';
import { parseCardCode } from '$helpers/card-utils';

async function getStreamedCollectionData(
	allCards: FullCard[],
	prices: Record<string, PriceData>,
	sets: TSet[],
	collectionItemsSource: Array<{ card_code: string }> | undefined | null,
	targetProfileForCollection: UserProfile | null,
	isPublicForCollection: boolean,
	loggedInUsernameForCollection: string | null,
	selectedSetName?: string | null
) {
	// Base data for cards (pokemons, rarities, types, artists)
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]).catch(e => {
		throw new Error('Failed to load necessary card data for page');
	});

	let collectionCards: FullCard[] = [];
	let itemsToProcess = collectionItemsSource;

	// If viewing another user's public profile, fetch their collection items afresh
	// This logic needs to be robust against targetProfileForCollection being null if profile wasn't found
	if (targetProfileForCollection && isPublicForCollection && loggedInUsernameForCollection !== targetProfileForCollection.username) {
		const { data: targetUserCollectionItems, error: collectionError } = await getUserCollection(targetProfileForCollection.username);
		if (collectionError) {
			itemsToProcess = []; // Default to empty on error
		} else {
			itemsToProcess = targetUserCollectionItems;
		}
	}

	if (itemsToProcess) {
		const collectionCardCodes = new Set(itemsToProcess.map(item => item.card_code));
		collectionCards = allCards.filter((card: FullCard) => collectionCardCodes.has(card.cardCode));

		if (selectedSetName) {
			const selectedSetObject = sets.find(s => s.name === selectedSetName);

			if (selectedSetObject) {
				const setPrimaryPtcgoCode = selectedSetObject.ptcgoCode?.toLowerCase();
				const setAliasesLower = selectedSetObject.aliases?.map(a => a.toLowerCase()) || [];

				collectionCards = collectionCards.filter((card: FullCard) => {
					if (!card.cardCode) return false; // Should not happen with FullCard
					const parsedCard = parseCardCode(card.cardCode);
					
					if (!parsedCard || !parsedCard.setCode) {
						// If cardCode can't be parsed or has no setCode, it can't match by code.
						// Optionally, could fall back to card.setName === selectedSetObject.name here if desired,
						// but matching by parsed set code is more robust for sets with aliases.
						// For now, if parsing fails, we consider it a non-match for code-based filtering.
						return card.setName.toLowerCase() === selectedSetObject.name.toLowerCase(); // Fallback to exact name match
					}

					const cardSetCodeLower = parsedCard.setCode.toLowerCase();

					// Check if card's parsed set code matches the primary ptcgoCode of the selected set
					if (setPrimaryPtcgoCode && cardSetCodeLower === setPrimaryPtcgoCode) {
						return true;
					}

					// Check if card's parsed set code is in the selected set's aliases
					if (setAliasesLower.includes(cardSetCodeLower)) {
						return true;
					}
					
					// Fallback: if card's actual setName matches the selected set's name directly
					// This handles cases where card.cardCode might not have a parsable set code matching aliases/ptcgoCode
					// but card.setName is still the primary name of the set.
					if (card.setName.toLowerCase() === selectedSetObject.name.toLowerCase()) {
						return true;
					}

					return false;
				});
			} else {
				collectionCards = collectionCards.filter((card: FullCard) => card.setName.toLowerCase() === selectedSetName.toLowerCase());
			}
		}
	} else {
		// This case handles: not public & not owner, OR itemsToProcess was null/undefined initially (e.g. own profile, layoutCollectionItems was null)
		collectionCards = [];
	}

	return {
		pokemons,
		sets,
		rarities,
		types,
		artists,
		serverCollectionCards: collectionCards,
		prices: prices,
	};
}

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const parentData = await parent();
	const { profile: loggedInUserProfile, collectionItems: layoutCollectionItems, sets: parentSets, ...layoutData } = parentData;

	// Resolve allCards and prices from parent first
	const allCardsResolved = await parentData.streamed.allCards || [];
	const pricesResolved = await parentData.streamed.prices || {};
	// sets from parentData should already be resolved as per its definition in layout.server.ts
	const setsResolved = parentSets || [];
	const selectedSet = url.searchParams.get('set');

	const requestedUsername = params.user;
	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = requestedUsername;
	let isPublic = false;
	let title = 'Collection';
	let description = 'User collection';
	let profileError: any = null;

	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
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
			title = `${targetProfile.username}'s Collection`;
			description = `Pokémon TCG collection for user ${targetProfile.username}.`;
		} else {
			title = 'Private Collection';
			description = `This user's collection is private.`;
		}
	}

	if (loggedInUserProfile && loggedInUserProfile.username === targetUsername && targetProfile) {
		title = 'My Collection';
		description = 'Your Pokémon TCG card collection.';
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	// Determine the source of collection items for getStreamedCollectionData
	// This logic needs to be here because targetProfile is resolved here.
	let collectionSourceItems = null;
	if (targetProfile && loggedInUserProfile && loggedInUserProfile.username === targetProfile.username) {
		// Own profile: use layout collection items
		collectionSourceItems = layoutCollectionItems as Array<{ card_code: string }> | undefined | null;
	} else if (targetProfile && isPublic) {
		// Other's public profile: getStreamedCollectionData will fetch it. Pass null to indicate it should fetch.
		collectionSourceItems = null; 
	} else {
		// Private profile (not owner), or user not found: effectively empty or handled by profile checks on page
		collectionSourceItems = [];
	}

	return {
		...layoutData,
		targetProfile,
		isPublic,
		targetUsername,
		title,
		description,
		image: ogImage,
		allCards: allCardsResolved,
		prices: pricesResolved,
		sets: setsResolved,
		streamed: {
			collectionData: getStreamedCollectionData(
				allCardsResolved,
				pricesResolved,
				setsResolved,
				collectionSourceItems,
				targetProfile,
				isPublic,
				loggedInUserProfile?.username || null,
				selectedSet
			)
		}
	};
};
