import { error, redirect } from '@sveltejs/kit';
import { getCards, getPokemons, getSets, getPrices, getRarities, getTypes, getArtists } from '$helpers/data';
import { getUserCollection } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile } from '$lib/types';

export const load: PageServerLoad = async ({ url, locals }) => {
	console.log('Running +page.server.ts load for collection page:', url.href);
	const targetUsername = url.searchParams.get('user');

	// --- Always load base data --- 
	let allCards: FullCard[] = [];
	let pokemons = [];
	let sets = [];
	let rarities = [];
	let types = [];
	let prices = {};
	let artists = [];
	
	try {
		allCards = await getCards();
		pokemons = await getPokemons();
		sets = await getSets();
		rarities = await getRarities();
		types = await getTypes();
		prices = await getPrices();
		artists = await getArtists();
	} catch (e) {
		console.error("Error loading global card data:", e);
		throw error(500, 'Failed to load necessary card data');
	}
	// --- End base data loading ---

	if (targetUsername) {
		// --- Viewing a specific user --- 
		let targetProfile: UserProfile | null = null;
		let profileError: any = null;

		({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

		if (profileError && !targetProfile) { // Check if error occurred AND profile is null
			// Handle cases where profile fetch fails (e.g., Supabase error, maybe user not found)
			console.error(`Error fetching profile for ${targetUsername}:`, profileError);
			return {
				allCards, pokemons, sets, rarities, types, prices, artists, // Base data
				targetProfile: null,
				isPublic: false,
				serverCollectionCards: null,
				targetUsername, // Pass target username for client display
				title: 'User Not Found',
				description: `Collection for user ${targetUsername} could not be found.`,
			};
		}

		if (!targetProfile) {
			// User specifically not found (query succeeded but returned no profile)
			return {
				allCards, pokemons, sets, rarities, types, prices, artists,
				targetProfile: null,
				isPublic: false,
				serverCollectionCards: null,
				targetUsername,
				title: 'User Not Found',
				description: `User ${targetUsername} does not exist.`,
			};
		}

		// --- Profile Found - Check Casing and Redirect if needed --- 
		if (targetProfile.username !== targetUsername) {
			// Input username casing differs from stored username, redirect to correct URL
			const correctUrl = `/collection?user=${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl); // 307 Temporary Redirect is appropriate here
		}
		// --- End Casing Check --- 

		if (targetProfile.is_public) {
			// Profile is public, fetch collection
			const { data: collectionItems, error: collectionError } = await getUserCollection(targetProfile.username);
			if (collectionError) {
				console.error(`Error fetching collection for ${targetProfile.username}:`, collectionError);
				throw error(500, `Failed to load collection for ${targetProfile.username}`);
			}
			const collectionCardCodes = new Set(collectionItems?.map(item => item.card_code) || []);
			const collectionCards: FullCard[] = allCards.filter(card => collectionCardCodes.has(card.cardCode));

			return {
				allCards, pokemons, sets, rarities, types, prices, artists,
				targetProfile, 
				isPublic: true,
				serverCollectionCards: collectionCards,
				targetUsername: targetProfile.username,
				title: `${targetProfile.username}'s Collection`,
				description: `Pokémon TCG collection for user ${targetProfile.username}.`,
			};
		} else {
			// Profile is private
			return {
				allCards, pokemons, sets, rarities, types, prices, artists,
				targetProfile, 
				isPublic: false,
				serverCollectionCards: null, 
				targetUsername: targetProfile.username,
				title: 'Private Collection',
				description: `This user's collection is private.`,
			};
		}
		// --- End viewing specific user ---
	} else {
		// --- Viewing own collection (no ?user param) --- 
		// Client will handle fetching own collection.
		return {
			allCards, pokemons, sets, rarities, types, prices, artists, // Provide base data
			targetProfile: null, // Indicate no specific target user from URL
			isPublic: false, // Not applicable
			serverCollectionCards: null, // Client needs to fetch
			targetUsername: null,
			title: 'My Collection',
			description: 'Your Pokémon TCG card collection.',
		};
	}
}; 