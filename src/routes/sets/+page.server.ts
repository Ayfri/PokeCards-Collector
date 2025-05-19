import { findSetByCardCode } from '$helpers/set-utils';
import type { PageServerLoad } from './$types';
import type { SetWithPrice } from '$lib/types';

export const load: PageServerLoad = async ({ parent }) => {
	const { allCards: cards, sets, prices, ...layoutData } = await parent();

	// Optimized approach:
	// 1. Iterate through all cards once, parsing their cardCode to get a set identifier.
	//    Sum prices into a map where keys are these set identifiers. This assumes that
	//    the part of the cardCode before the last dash (e.g., 'swsh11' from 'swsh11-1')
	//    corresponds to the 'id' property of a Set object.
	// 2. Iterate through all sets. For each set, use its 'id' to look up the total price
	//    from the map created in step 1.

	const setPriceTotals = new Map<string, number>();

	// Populate the price totals map by iterating through cards
	for (const card of cards) {
		// Extract set identifier from card.cardCode. Example: 'swsh11-1' -> 'swsh11'.
		const lastDashIndex = card.cardCode.lastIndexOf('-');

		// If card.cardCode does not contain a dash, or if the dash is the first character,
		// we cannot reliably extract a set identifier in this manner.
		if (lastDashIndex <= 0) {
			// console.warn(`Card code ${card.cardCode} does not follow 'setid-number' pattern.`);
			continue;
		}
		const setIdFromCardCode = card.cardCode.substring(0, lastDashIndex);

		const priceData = prices[card.cardCode];
		const price = priceData?.simple ?? 0;

		// Sum prices for this set identifier
		if (price > 0) { // Only sum if there's a price, to keep the map smaller if many cards have 0 price
			setPriceTotals.set(setIdFromCardCode, (setPriceTotals.get(setIdFromCardCode) || 0) + price);
		}
	}

	// Map sets to SetWithPrice, using the calculated totals
	const setsWithPrices = sets.map(set => {
		// Look up the total price using the set's 'id'.
		// This assumes 'set.id' (e.g., 'swsh11') matches the 'setIdFromCardCode' (e.g., 'swsh11')
		// extracted from card.cardCode in the loop above.
		const totalPrice = setPriceTotals.get(set.name) || 0;
		
		return {
			...set,
			totalPrice,
		} as SetWithPrice;
	});

	const pageSeoData: Partial<typeof layoutData> = {
		title: 'Sets',
		description: 'Browse all Pokémon Trading Card Game sets in chronological order, view set information including release dates and card counts.'
	};

	return {
		...layoutData,
		setsWithPrices,
		...pageSeoData
	};
};
