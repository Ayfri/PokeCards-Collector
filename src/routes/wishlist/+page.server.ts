import { error } from '@sveltejs/kit';
import { getCards, getPokemons, getSets, getRarities, getTypes } from '$helpers/data';
import { getUserWishlist } from '$lib/services/wishlists';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile } from '$lib/types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const targetUsername = url.searchParams.get('user');

	// --- Always load base data --- 
	let allCards: FullCard[] = [];
	let pokemons = [];
	let sets = [];
	let rarities = [];
	let types = [];
	try {
		allCards = await getCards();
		pokemons = await getPokemons();
		sets = await getSets();
		rarities = await getRarities();
		types = await getTypes();
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
			// We can refine this, but for now, assume user not found or error
			console.error(`Error fetching profile for ${targetUsername}:`, profileError);
			return {
				allCards, pokemons, sets, rarities, types, // Base data
				targetProfile: null,
				isPublic: false,
				serverWishlistCards: null,
				targetUsername, // Pass target username for client display
				title: 'User Not Found',
				description: `Wishlist for user ${targetUsername} could not be found.`,
			};
		}

		if (!targetProfile) {
			// User specifically not found (query succeeded but returned no profile)
			return {
				allCards, pokemons, sets, rarities, types,
				targetProfile: null,
				isPublic: false,
				serverWishlistCards: null,
				targetUsername,
				title: 'User Not Found',
				description: `User ${targetUsername} does not exist.`,
			};
		}

		if (targetProfile.is_public) {
			// Profile is public, fetch wishlist
			const { data: wishlistItems, error: wishlistError } = await getUserWishlist(targetUsername);
			if (wishlistError) {
				console.error(`Error fetching wishlist for ${targetUsername}:`, wishlistError);
				throw error(500, `Failed to load wishlist for ${targetUsername}`);
			}
			const wishlistCardCodes = new Set(wishlistItems?.map(item => item.card_code) || []);
			const wishlistCards: FullCard[] = allCards.filter(card => wishlistCardCodes.has(card.cardCode));

			return {
				allCards, pokemons, sets, rarities, types,
				targetProfile, 
				isPublic: true,
				serverWishlistCards: wishlistCards,
				targetUsername,
				title: `${targetUsername}'s Wishlist`,
				description: `Pokémon TCG wishlist for user ${targetUsername}.`,
			};
		} else {
			// Profile is private
			return {
				allCards, pokemons, sets, rarities, types,
				targetProfile, 
				isPublic: false,
				serverWishlistCards: null, 
				targetUsername,
				title: 'Private Wishlist',
				description: `This user's wishlist is private.`,
			};
		}
		// --- End viewing specific user ---
	} else {
		// --- Viewing own wishlist (no ?user param) --- 
		// We can't reliably get logged-in user here due to locals issues.
		// Client will handle fetching own wishlist.
		return {
			allCards, pokemons, sets, rarities, types, // Provide base data
			targetProfile: null, // Indicate no specific target user from URL
			isPublic: false, // Not applicable
			serverWishlistCards: null, // Client needs to fetch
			targetUsername: null,
			title: 'My Wishlist',
			description: 'Your Pokémon TCG card wishlist.',
		};
	}
}; 