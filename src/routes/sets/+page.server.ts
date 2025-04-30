import { getCards, getPrices, getSets } from '$helpers/data';
import { findSetByCardCode } from '$helpers/set-utils';
import type { PageServerLoad } from './$types';
import type { SetWithPrice } from '$lib/types';
export const load: PageServerLoad = async ({ parent }) => {
	const layoutData = await parent();

	const [rawSets, rawCards, rawPrices] = await Promise.all([getSets(), getCards(), getPrices()]);
	
	const sets = rawSets;
	const cards = rawCards;
	const prices = rawPrices;

	const setsWithPrices = sets.map(set => {
		const setCards = cards.filter(card => findSetByCardCode(card.cardCode, [set]));
		const totalPrice = setCards.reduce((sum, card) => {
			const priceData = prices[card.cardCode];
			const price = priceData?.simple ?? 0;
			return sum + price;
		}, 0);
		
		return {
			totalPrice,
			...set
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
