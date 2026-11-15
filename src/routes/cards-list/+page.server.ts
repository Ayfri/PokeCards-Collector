import type { PageServerLoad } from './$types';
import { gridSetView } from '#helpers/grid-payload.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { CATALOGUES } from '#helpers/catalogues.ts';
import { ogImage } from '#helpers/og-image.ts';

/**
 * SEO only: the grid's cards, prices, pokemons and types come from `/api/cards-list` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends what it returns:
 * the sets come from `+layout.server.ts` for that reason, and `preloadPayload` is only true for the document request.
 */
export const load: PageServerLoad = async ({ isDataRequest, parent, url }) => {
	const { sets } = await parent();

	const view = await gridSetView(url, isDataRequest, sets, CATALOGUES.en);
	let image = ogImage({ kind: 'page', name: 'cards-list' }, 'Every English Pokémon TCG card on PokéCards-Collector: the card and set count, and the three most valuable cards');
	let ogTitle = 'All Pokémon Cards';
	let ogDescription = 'Browse every Pokémon TCG card with its Cardmarket price in euros. Filter by set, artist, rarity, type or Pokémon, and sort by price, name or Pokédex number.';
	let ogKeywords = ['Pokémon card list', 'Pokémon TCG cards', 'Pokémon card prices', 'Pokémon card search'];
	let ogCrumbs = breadcrumbs({ name: 'Cards', url: '/cards-list' });
	let canonical: string | undefined;

	if (view) {
		const { set, total } = view;
		({ canonical, image } = view);
		ogTitle = `${set.name} Card List & Prices`;
		ogDescription = `Every card in the ${set.name} Pokémon TCG set${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.`;
		ogKeywords = [`${set.name} card list`, `${set.name} set`, `${set.name} card prices`, 'Pokémon TCG'];
		ogCrumbs = breadcrumbs({ name: 'Sets', url: '/sets' }, { name: set.name, url: view.canonical });
	}

	return {
		breadcrumbs: ogCrumbs,
		canonical,
		description: ogDescription,
		image,
		keywords: ogKeywords,
		/** A client navigation already starts the payload fetch from `+page.ts`, so only the document preloads it. */
		preloadPayload: !isDataRequest,
		title: ogTitle,
		type: 'CollectionPage' as const,
	};
}
