import { error, redirect } from '@sveltejs/kit';
import { getCards, getPokemons, getSets, getRarities, getTypes, getPrices, getArtists } from '$helpers/data';
import { getUserCollection } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const requestedUsername = params.user;
	const loggedInUserProfile = locals.profile;

	// --- Always load base data --- 
	const [allCards, pokemons, sets, rarities, types, prices, artists] = await Promise.all([
		getCards(),
		getPokemons(),
		getSets(),
		getRarities(),
		getTypes(),
		getPrices(),
		getArtists()
	]).catch(e => {
		console.error("Error loading global card data:", e);
		throw error(500, 'Failed to load necessary card data');
	});
	// --- End base data loading ---

	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = null;
	let isPublic = false;
	let collectionCards: FullCard[] | null = null;
	let title = 'Collection';
	let description = 'User collection';
	let profileError: any = null;


	// --- Viewing a specific user --- 
	targetUsername = requestedUsername;
	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
		console.error(`Error fetching profile or profile not found for ${targetUsername}:`, profileError);
		targetProfile = null; // Ensure profile is null
		title = 'User Not Found';
		description = `Collection for user ${targetUsername} could not be found or user does not exist.`;
	} else {
		// --- Profile Found - Check Casing and Redirect if needed --- 
		if (targetProfile.username !== targetUsername) {
			const correctUrl = `/collection/${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}
		// --- End Casing Check --- 
		targetUsername = targetProfile.username; // Use correct casing
		isPublic = targetProfile.is_public;

		if (isPublic || (loggedInUserProfile && loggedInUserProfile.username === targetProfile.username)) {
			// Fetch if public OR if the logged-in user is viewing their own profile
			const { data: collectionItems, error: collectionError } = await getUserCollection(targetProfile.username);
			if (collectionError) {
				console.error(`Error fetching collection for ${targetProfile.username}:`, collectionError);
				// Don't throw, just return null collection
			} else {
				const collectionCardCodes = new Set(collectionItems?.map(item => item.card_code) || []);
				collectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
			}
			title = `${targetProfile.username}'s Collection`;
			description = `Pokémon TCG collection for user ${targetProfile.username}.`;
		} else {
			// Profile is private and not owned by viewer
			title = 'Private Collection';
			description = `This user's collection is private.`;
		}
	}

	// If viewing own collection, change title and description
	if (loggedInUserProfile && loggedInUserProfile.username === targetUsername) {
		title = 'My Collection';
		description = 'Your Pokémon TCG card collection.';
	}

	// At the end, always use favicon.png as Open Graph image
	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		// Base data
		allCards, pokemons, sets, rarities, types, prices, artists,
		// User/Collection specific data
		targetProfile, 
		isPublic,
		serverCollectionCards: collectionCards, // Renamed for clarity vs client-side
		targetUsername, // The username whose collection is being viewed (could be logged-in user)
		title,
		description,
		image: ogImage,
	};
}; 