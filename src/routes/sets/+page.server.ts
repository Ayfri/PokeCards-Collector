import { getCards, getPrices } from '$helpers/supabase-data';
import { buildSetLookupMap, findSetInLookup } from '$helpers/set-utils';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setListSchema } from '$helpers/seo';
import type { SetWithPrice } from '$lib/types';

export const load: PageServerLoad = async ({ parent }) => {
	const catalogue = Promise.all([getCards(), getPrices()]);
	const { sets: setsFromParent = [] } = await parent();
	const [cards, prices] = await catalogue;

	// One map lookup per card instead of a scan over every set, which normalized ~5M set ids a render.
	const setLookup = buildSetLookupMap(setsFromParent);
	const setPriceTotals = new Map<string, number>();

	for (const card of cards) {
		const foundSet = findSetInLookup(card.cardCode, setLookup);
		if (!foundSet?.ptcgoCode) continue;

		const currentPrice = prices[card.cardCode]?.simple ?? 0;
		if (currentPrice > 0) setPriceTotals.set(foundSet.ptcgoCode, (setPriceTotals.get(foundSet.ptcgoCode) || 0) + currentPrice);
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

	// `cards` and `prices` stay on the server: the page renders `setsWithPrices` alone, and shipping the
	// catalogue alongside it turned this route into a 24 MB document.
	return {
		setsWithPrices,
		...pageSeoData
	};
};
