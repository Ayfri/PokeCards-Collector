import { getCards, getPrices, getSets } from '$helpers/data';
import { getUserCollection } from '$lib/services/collections';
import { getUserWishlist } from '$lib/services/wishlists';
import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	// Load necessary data
	const allCards = await getCards();
	const sets = await getSets();
	const prices = await getPrices();

	// Initialize collection and wishlist cards as null
	let serverCollectionCards: FullCard[] | null = null;
	let serverWishlistCards: FullCard[] | null = null;

	// If user is logged in, fetch their collection and wishlist
	if (locals.profile) {
		const username = locals.profile.username;
		
		// Fetch collection
		const { data: collectionItems, error: collectionError } = await getUserCollection(username);
		if (collectionError) {
			console.error(`Error fetching collection for ${username}:`, collectionError);
		} else if (collectionItems && collectionItems.length > 0) {
			const collectionCardCodes = new Set(collectionItems.map(item => item.card_code));
			serverCollectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		}
		
		// Fetch wishlist
		const { data: wishlistItems, error: wishlistError } = await getUserWishlist(username);
		if (wishlistError) {
			console.error(`Error fetching wishlist for ${username}:`, wishlistError);
		} else if (wishlistItems && wishlistItems.length > 0) {
			const wishlistCardCodes = new Set(wishlistItems.map(item => item.card_code));
			serverWishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
		}
	}

	return {
		title: 'Binder Builder - PokéStore',
		description: 'Create and manage your digital Pokémon card binder. Organize your collection with a customizable grid.',
		image: '/favicon.png',
		allCards,
		sets,
		prices,
		serverCollectionCards,
		serverWishlistCards
	};
}; 