import { BY_GRID } from '#helpers/catalogues.ts';
import { getSets } from '#helpers/supabase-data.ts';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setSchema } from '#helpers/seo.ts';

/**
 * SEO only: the grid's cards, prices, pokemons and types come from `/api/{grid}-cards` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends what it returns.
 */
export const load: PageServerLoad = async ({ params, parent, url }) => {
	const catalogue = BY_GRID[params.grid];
	const { adjective, gridRoute } = catalogue;

	/** `parent()` only supplies the fallback share image, so the sets load in parallel with it. */
	const [{ image: parentImage }, memoizedSets] = await Promise.all([parent(), getSets(catalogue.language)]);
	const sets = memoizedSets.toSorted((a, b) => a.name.localeCompare(b.name));

	const setParam = url.searchParams.get('set');
	let ogImage = null;
	let ogTitle = `${adjective} Pokémon Cards`;
	let ogDescription = `Browse ${adjective} Pokémon TCG cards across ${sets.length} ${adjective} sets, with Cardmarket prices in euros. Filter by set, type, rarity or artist.`;
	let ogKeywords = [`${adjective} Pokémon cards`, `${adjective} Pokémon TCG`, `${adjective} Pokémon card prices`, `${adjective} Pokémon sets`];
	let ogCrumbs = breadcrumbs({ name: `${adjective} cards`, url: gridRoute });
	const ogSchemas: Record<string, unknown>[] = [];

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			const total = set.totalCards ?? set.printedTotal;
			ogImage = { url: set.logo, alt: `${set.name} ${adjective} set logo` };
			ogTitle = `${set.name} - ${adjective} Card List`;
			ogDescription = `Every card in the ${adjective} Pokémon TCG set ${set.name}${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.`;
			ogKeywords = [`${set.name} ${adjective.toLowerCase()} set`, `${set.name} card list`, `${adjective} Pokémon TCG`];
			ogCrumbs = breadcrumbs({ name: `${adjective} cards`, url: gridRoute }, { name: set.name, url: `${gridRoute}?set=${encodeURIComponent(set.name)}` });
			ogSchemas.push(setSchema(set, catalogue));
		}
	}

	return {
		sets,
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? parentImage,
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		note: catalogue.note,
		schemas: ogSchemas,
		type: 'CollectionPage' as const,
	};
};
