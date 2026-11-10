import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { breadcrumbs, setListSchema } from '#helpers/seo.ts';
import type { SetWithPrice } from '#lib/types.js';
import { cardPrice } from '#helpers/card-utils.ts';

export const load: PageServerLoad = async () => {
	const [cards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);

	const setPriceTotals = new Map<string, number>();
	for (const card of cards) {
		const price = cardPrice(prices[card.cardCode]);
		if (price && card.setId) setPriceTotals.set(card.setId, (setPriceTotals.get(card.setId) ?? 0) + price);
	}

	const setsWithPrices: SetWithPrice[] = sets.map(set => ({ ...set, totalPrice: setPriceTotals.get(set.setId ?? '') ?? 0 }));

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Sets', url: '/sets' }),
		description: `All ${setsWithPrices.length} Pokémon TCG sets, from Base Set to the latest release, with release dates, card counts and the estimated total value of a complete set in euros.`,
		keywords: ['Pokémon TCG sets', 'Pokémon set list', 'Pokémon set value', 'Pokémon card sets by release date'],
		schemas: [setListSchema(setsWithPrices)],
		image: ogImage({ kind: 'page', name: 'sets' }, 'Every Pokémon TCG set on PokéCards-Collector, with the set and series count and the most valuable cards'),
		title: 'All Pokémon TCG Sets',
		type: 'CollectionPage' as const,
	};

	/** `cards` and `prices` stay on the server: the page renders `setsWithPrices` alone, and sending the catalogue with it would make a 24 MB document. */
	return {
		setsWithPrices,
		...pageSeoData
	};
};
