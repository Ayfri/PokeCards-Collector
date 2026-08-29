import { findSetByCardCode } from '$helpers/set-utils';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setListSchema } from '$helpers/seo';
import type { SetWithPrice } from '$lib/types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const cards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const setsFromParent = parentData.sets || [];

	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	const setPriceTotals = new Map<string, number>();

	for (const card of cards) {

		const foundSet = findSetByCardCode(card.cardCode, setsFromParent);

		if (!foundSet || !foundSet.ptcgoCode) {
			continue;
		}

		const setIdentifierForTotals = foundSet.ptcgoCode;

		const priceData = prices[card.cardCode];
		const currentPrice = priceData?.simple ?? 0;

		if (currentPrice > 0) {
			setPriceTotals.set(setIdentifierForTotals, (setPriceTotals.get(setIdentifierForTotals) || 0) + currentPrice);
		}
	}

	const setsWithPrices = setsFromParent.map(set => {
		const totalPrice = set.ptcgoCode ? setPriceTotals.get(set.ptcgoCode) || 0 : 0;
		return {
			...set,
			totalPrice,
		} as SetWithPrice;
	});

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Sets', url: '/sets' }),
		description: `All ${setsWithPrices.length} Pokémon TCG sets, from Base Set to the latest release, with release dates, card counts and the estimated total value of a complete set in euros.`,
		keywords: ['Pokémon TCG sets', 'Pokémon set list', 'Pokémon set value', 'Pokémon card sets by release date'],
		schemas: [setListSchema(setsWithPrices)],
		title: 'All Pokémon TCG Sets',
		type: 'CollectionPage' as const,
	};

	return {
		...layoutData,
		setsWithPrices,
		allCards: cards,
		prices: prices,
		...pageSeoData
	};
};
