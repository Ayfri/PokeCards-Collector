import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import type { PageServerLoad } from './$types';
import { BY_GRID, type Catalogue, CATALOGUES } from '#helpers/catalogues.ts';
import { ogImage } from '#helpers/og-image.ts';
import { breadcrumbs, setListSchema } from '#helpers/seo.ts';
import type { Set as CardSet, FullCard, PriceData, SetWithPrice } from '#lib/types.js';
import { cardPrice, memoizedOn } from '#helpers/card-utils.ts';

/** Keyed on the memoized tables: the pass over every card runs once per refreshed table instead of once per request. */
const totals = new WeakMap<object, unknown>();

const withTotals = (cards: FullCard[], prices: Record<string, PriceData>, sets: CardSet[]) => memoizedOn(totals, [cards, prices, sets], (): SetWithPrice[] => {
	const setPriceTotals = new Map<string, number>();
	for (const card of cards) {
		const price = cardPrice(prices[card.cardCode]);
		if (price && card.setId) setPriceTotals.set(card.setId, (setPriceTotals.get(card.setId) ?? 0) + price);
	}

	return sets.map(set => ({ ...set, totalPrice: setPriceTotals.get(set.setId ?? '') ?? 0 }));
});

/** Serves the set lists `/sets`, `/france/sets` and `/japan/sets`. */
export const load: PageServerLoad = async ({ params }) => {
	const catalogue: Catalogue = params.grid ? BY_GRID[params.grid] : CATALOGUES.en;
	const { adjective, language, routeCode, setsRoute } = catalogue;

	const [cards, prices, sets] = await Promise.all([getCards(language), getPrices(language), getSets(language)]);
	const setsWithPrices = withTotals(cards, prices, sets);
	const prefix = routeCode ? `${adjective} ` : '';

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: routeCode ? `${adjective} sets` : 'Sets', url: setsRoute }),
		catalogueLanguage: language,
		description: `All ${setsWithPrices.length} ${prefix}Pokémon TCG sets, from Base Set to the latest release, with release dates, card counts and the estimated total value of a complete set in euros.`,
		image: ogImage(
			{ kind: 'page', name: params.grid ?? 'sets' },
			routeCode
				? `Every ${adjective} Pokémon TCG card on PokéCards-Collector: the card and set count, and the three most valuable cards`
				: 'Every Pokémon TCG set on PokéCards-Collector, with the set and series count and the most valuable cards',
		),
		keywords: [`${prefix}Pokémon TCG sets`, `${prefix}Pokémon set list`, `${prefix}Pokémon set value`, `${prefix}Pokémon card sets by release date`],
		schemas: [setListSchema(setsWithPrices, catalogue)],
		title: `All ${prefix}Pokémon TCG Sets`,
		type: 'CollectionPage' as const,
	};

	/** `cards` and `prices` stay on the server: the page renders `setsWithPrices` alone, and sending the catalogue with it would make a 24 MB document. */
	return {
		setsWithPrices,
		...pageSeoData
	};
};
