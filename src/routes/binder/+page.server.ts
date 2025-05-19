import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { allCards, sets, prices, collectionItems: layoutCollectionItems, wishlistItems: layoutWishlistItems, ...layoutData } = await parent();

	// Initialize collection and wishlist cards as null
	let serverCollectionCards: FullCard[] | null = null;
	let serverWishlistCards: FullCard[] | null = null;

	// If user is logged in, process their collection and wishlist items from layoutData
	if (locals.profile) {
		// Process collection items from layout
		if (layoutCollectionItems && layoutCollectionItems.length > 0) {
			const collectionCardCodes = new Set(layoutCollectionItems.map(item => item.card_code));
			serverCollectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		} else {
			serverCollectionCards = []; // Ensure it's an empty array if no items
		}

		// Process wishlist items from layout
		if (layoutWishlistItems && layoutWishlistItems.length > 0) {
			const wishlistCardCodes = new Set(layoutWishlistItems.map(item => item.card_code));
			serverWishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
		} else {
			serverWishlistCards = []; // Ensure it's an empty array if no items
		}
	}

	return {
		...layoutData, // Spread the rest of layoutData (like user, profile, default SEO)
		title: 'Binder Builder - PokéCards-Collector',
		description: 'Create and manage your digital Pokémon card binder. Organize your collection with a customizable grid.',
		image: '/favicon.png',
		allCards, // From layout
		sets,     // From layout
		prices,   // From layout
		serverCollectionCards,
		serverWishlistCards
	};
};
