import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const parentData = await parent();

	// Await the streamed promises from parent for allCards and prices
	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	
	// Get other resolved data from parent
	const sets = parentData.sets || [];
	const layoutCollectionItems = parentData.collectionItems || [];
	const layoutWishlistItems = parentData.wishlistItems || [];

	// Extract other necessary layout data (e.g., user, profile, default SEO)
	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title, // Parent's default title
		description: parentData.description, // Parent's default description
		image: parentData.image, // Parent's default image
		// wishlistItems and collectionItems are handled via layoutCollectionItems/layoutWishlistItems
	};

	// Initialize collection and wishlist cards as null or empty arrays
	let serverCollectionCards: FullCard[] = [];
	let serverWishlistCards: FullCard[] = [];

	// If user is logged in, process their collection and wishlist items
	if (locals.profile) {
		// Process collection items
		if (layoutCollectionItems.length > 0) {
			const collectionCardCodes = new Set(layoutCollectionItems.map(item => item.card_code));
			serverCollectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		}

		// Process wishlist items
		if (layoutWishlistItems.length > 0) {
			const wishlistCardCodes = new Set(layoutWishlistItems.map(item => item.card_code));
			serverWishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
		}
	}

	return {
		...layoutData, 
		title: 'Binder Builder - PokéCards-Collector', // Page specific SEO
		description: 'Create and manage your digital Pokémon card binder. Organize your collection with a customizable grid.',
		image: parentData.image, // Use parent's image or a specific one if desired e.g. '/favicon.png'
		allCards, 
		sets,     
		prices,   
		serverCollectionCards,
		serverWishlistCards,
		// Pass collectionItems and wishlistItems from parent as they might be used directly by the page component
		collectionItems: layoutCollectionItems,
		wishlistItems: layoutWishlistItems 
	};
};
