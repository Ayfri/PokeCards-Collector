import type { PageServerLoad } from './$types';
import { breadcrumbs } from '$helpers/seo';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const parentData = await parent();

	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	
	const sets = parentData.sets || [];
	const layoutCollectionItems = parentData.collectionItems || [];
	const layoutWishlistItems = parentData.wishlistItems || [];

	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
	};

	let serverCollectionCards: FullCard[] = [];
	let serverWishlistCards: FullCard[] = [];

	if (locals.profile) {
		if (layoutCollectionItems.length > 0) {
			const collectionCardCodes = new Set(layoutCollectionItems.map(item => item.card_code));
			serverCollectionCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		}

		if (layoutWishlistItems.length > 0) {
			const wishlistCardCodes = new Set(layoutWishlistItems.map(item => item.card_code));
			serverWishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
		}
	}

	return {
		...layoutData, 
		title: 'Pokémon Card Binder Builder',
		description: 'Lay out a digital Pokémon card binder page by page. Pick a grid size, drop in cards from the whole catalogue or from your own collection, and export the result as an image.',
		breadcrumbs: breadcrumbs({ name: 'Binder', url: '/binder' }),
		keywords: ['Pokémon binder builder', 'digital card binder', 'Pokémon card layout', 'binder page maker'],
		image: parentData.image,
		allCards, 
		sets,     
		prices,   
		serverCollectionCards,
		serverWishlistCards,
		collectionItems: layoutCollectionItems,
		wishlistItems: layoutWishlistItems 
	};
};
