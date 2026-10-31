import { getCards, getPrices } from '$helpers/supabase-data';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setListSchema } from '$helpers/seo';
import type { SetWithPrice } from '$lib/types';
import { cardPrice } from '$helpers/card-utils';

export const load: PageServerLoad = async ({ parent }) => {
	const catalogue = Promise.all([getCards(), getPrices()]);
	const { sets: setsFromParent = [] } = await parent();
	const [cards, prices] = await catalogue;

	const setPriceTotals = new Map<string, number>();
	for (const card of cards) {
		const price = cardPrice(prices[card.cardCode]);
		if (price && card.setId) setPriceTotals.set(card.setId, (setPriceTotals.get(card.setId) ?? 0) + price);
	}

	const setsWithPrices: SetWithPrice[] = setsFromParent.map(set => ({ ...set, totalPrice: setPriceTotals.get(set.setId ?? '') ?? 0 }));

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Sets', url: '/sets' }),
		description: `All ${setsWithPrices.length} Pokémon TCG sets, from Base Set to the latest release, with release dates, card counts and the estimated total value of a complete set in euros.`,
		keywords: ['Pokémon TCG sets', 'Pokémon set list', 'Pokémon set value', 'Pokémon card sets by release date'],
		schemas: [setListSchema(setsWithPrices)],
		title: 'All Pokémon TCG Sets',
		type: 'CollectionPage' as const,
	};

	// `cards` and `prices` stay on the server: the page renders `setsWithPrices` alone, and shipping the
	// catalogue alongside it turned this route into a 24 MB document.
	return {
		setsWithPrices,
		...pageSeoData
	};
};
