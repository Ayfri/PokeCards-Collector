import { getCards, getPrices, getSets } from '$helpers/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const layoutData = await parent();

	const [rawSets, rawCards, rawPrices] = await Promise.all([getSets(), getCards(), getPrices()]);
	
	const sets = rawSets;
	const cards = rawCards;
	const prices = rawPrices;

	const setsWithPrices = sets.map(set => {
		const setCards = cards.filter(card => card.setName === set.name);
		const totalPrice = setCards.reduce((sum, card) => {
			const priceData = prices[card.cardCode];
			const price = priceData?.simple;
			return sum + (price || 0);
		}, 0);

		return {
			...set,
			totalPrice
		};
	});

	const pageSeoData: Partial<typeof layoutData> = {
		title: 'Pokémon TCG Sets - PokéStore',
		description: 'Browse all Pokémon Trading Card Game sets in chronological order, view set information including release dates and card counts.'
	};

	return {
		...layoutData,
		sets: setsWithPrices,
		...pageSeoData
	};
};
