import { findSetByCardCode } from '$helpers/set-utils';
import type { PageServerLoad } from './$types';
import type { SetWithPrice } from '$lib/types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	// Await the streamed promises from parent
	const cards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const setsFromParent = parentData.sets || []; // 'sets' is already resolved in parentData

	// Extract other necessary layout data (e.g., user, profile, default SEO)
	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title, // Parent's default title
		description: parentData.description, // Parent's default description
		image: parentData.image, // Parent's default image
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	const setPriceTotals = new Map<string, number>();

	// Populate the price totals map by iterating through cards
	for (const card of cards) { // Now 'cards' is the resolved array
		const lastDashIndex = card.cardCode.lastIndexOf('-');

		if (lastDashIndex <= 0) {
			continue;
		}
		const setIdFromCardCode = card.cardCode.substring(0, lastDashIndex);

		const priceData = prices[card.cardCode]; // Now 'prices' is the resolved object
		const currentPrice = priceData?.simple ?? 0;

		if (currentPrice > 0) {
			setPriceTotals.set(setIdFromCardCode, (setPriceTotals.get(setIdFromCardCode) || 0) + currentPrice);
		}
	}

	// Map sets to SetWithPrice, using the calculated totals
	const setsWithPrices = setsFromParent.map(set => {
		const totalPrice = setPriceTotals.get(set.name) || 0; // Assuming set.name matches setIdFromCardCode logic (e.g. use set.id if that is the key)
		// If set.id should be used instead of set.name for lookup, this needs to be: setPriceTotals.get(set.id)

		return {
			...set,
			totalPrice,
		} as SetWithPrice;
	});

	const pageSeoData = {
		title: 'Sets - Pokémon TCG | PokéCards-Collector', // More specific title
		description: 'Browse all Pokémon Trading Card Game sets. View set information, release dates, card counts, and estimated total set values.'
	};

	return {
		...layoutData,
		setsWithPrices, // This is the main data for this page
		// prices, // No longer need to pass prices directly if all processing is done server-side
		// cards, // No longer need to pass all cards if all processing is done server-side
		...pageSeoData
	};
};
