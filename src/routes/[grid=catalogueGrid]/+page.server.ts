import { BY_GRID } from '#helpers/catalogues.ts';
import { gridSetView } from '#helpers/grid-payload.ts';
import { ogImage } from '#helpers/og-image.ts';
import type { PageServerLoad } from './$types';
import { breadcrumbs } from '#helpers/seo.ts';

/**
 * SEO only: the grid's cards, prices, pokemons and types come from `/api/{grid}-cards` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends what it returns:
 * the sets come from `+layout.server.ts` for that reason, and `preloadPayload` is only true for the document request.
 */
export const load: PageServerLoad = async ({ isDataRequest, params, parent, url }) => {
	const catalogue = BY_GRID[params.grid];
	const { adjective, gridRoute } = catalogue;

	const { sets } = await parent();

	const view = await gridSetView(url, isDataRequest, sets, catalogue);
	let image = ogImage({ kind: 'page', name: params.grid }, `Every ${adjective} Pokémon TCG card on PokéCards-Collector: the card and set count, and the three most valuable cards`);
	let ogTitle = `${adjective} Pokémon Cards`;
	let ogDescription = `Browse ${adjective} Pokémon TCG cards across ${sets.length} ${adjective} sets, with Cardmarket prices in euros. Filter by set, type, rarity or artist.`;
	let ogKeywords = [`${adjective} Pokémon cards`, `${adjective} Pokémon TCG`, `${adjective} Pokémon card prices`, `${adjective} Pokémon sets`];
	let ogCrumbs = breadcrumbs({ name: `${adjective} cards`, url: gridRoute });
	let canonical: string | undefined;

	if (view) {
		const { set, total } = view;
		({ canonical, image } = view);
		ogTitle = `${set.name} - ${adjective} Card List & Prices`;
		ogDescription = `Every card in the ${adjective} Pokémon TCG set ${set.name}${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.`;
		ogKeywords = [`${set.name} ${adjective.toLowerCase()} set`, `${set.name} card list`, `${adjective} Pokémon TCG`];
		ogCrumbs = breadcrumbs({ name: `${adjective} cards`, url: gridRoute }, { name: set.name, url: view.canonical });
	}

	return {
		breadcrumbs: ogCrumbs,
		canonical,
		description: ogDescription,
		image,
		keywords: ogKeywords,
		note: catalogue.note,
		/** A client navigation already starts the payload fetch from `+page.ts`, so only the document preloads it. */
		preloadPayload: !isDataRequest,
		title: ogTitle,
		type: 'CollectionPage' as const,
	};
};
