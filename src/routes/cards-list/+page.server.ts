import type { PageServerLoad } from './$types';
import { redirectToSetPage } from '#helpers/grid-payload.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { CATALOGUES } from '#helpers/catalogues.ts';
import { setPath } from '#helpers/card-utils.ts';
import { ogImage, setShareImage, setValue } from '#helpers/og-image.ts';
import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';

/**
 * SEO only: the grid's cards, prices, pokemons and types come from `/api/cards-list` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends what it returns.
 * The sets come back with it, ordered by name: `getSets()` is memoized, and the layout does not send them.
 */
export const load: PageServerLoad = async ({ isDataRequest, url }) => {
	const sets = await getSets();

	const setParam = url.searchParams.get('set');
	let image = ogImage({ kind: 'page', name: 'cards-list' }, 'Every English Pokémon TCG card on PokéCards-Collector: the card and set count, and the three most valuable cards');
	let ogTitle = 'All Pokémon Cards';
	let ogDescription = 'Browse every Pokémon TCG card with its Cardmarket price in euros. Filter by set, artist, rarity, type or Pokémon, and sort by price, name or Pokédex number.';
	let ogKeywords = ['Pokémon card list', 'Pokémon TCG cards', 'Pokémon card prices', 'Pokémon card search'];
	let ogCrumbs = breadcrumbs({ name: 'Cards', url: '/cards-list' });
	let canonical: string | undefined;

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			redirectToSetPage(url, isDataRequest, set, CATALOGUES.en);

			/** A `?set=` grid that combines filters is a view of the set page: it keeps its set title and image, and the set page is its canonical. */
			const [cards, prices] = await Promise.all([getCards(), getPrices()]);
			const total = set.totalCards ?? set.printedTotal;
			image = setShareImage(set, setValue(set.setId, cards, prices), CATALOGUES.en);
			ogTitle = `${set.name} Card List & Prices`;
			ogDescription = `Every card in the ${set.name} Pokémon TCG set${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.`;
			ogKeywords = [`${set.name} card list`, `${set.name} set`, `${set.name} card prices`, 'Pokémon TCG'];
			ogCrumbs = breadcrumbs({ name: 'Sets', url: '/sets' }, { name: set.name, url: setPath(set, CATALOGUES.en) });
			canonical = setPath(set, CATALOGUES.en);
		}
	}

	return {
		canonical,
		sets,
		title: ogTitle,
		description: ogDescription,
		image,
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		type: 'CollectionPage' as const,
	};
}
