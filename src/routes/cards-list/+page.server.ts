import type { PageServerLoad } from './$types';
import { breadcrumbs, setSchema } from '#helpers/seo.ts';
import { getSets } from '#helpers/supabase-data.ts';

/**
 * SEO only: the grid's cards, prices, pokemons and types come from `/api/cards-list` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends what it returns.
 * The sets are not returned: the layout already sends them, and `getSets()` is memoized and ordered by name.
 */
export const load: PageServerLoad = async ({ parent, url }) => {
	/** `parent()` only supplies the fallback share image, so the sets load in parallel with it. */
	const [{ image: parentImage }, sets] = await Promise.all([parent(), getSets()]);

	const setParam = url.searchParams.get('set');
	let ogImage = null;
	let ogTitle = 'All Pokémon Cards';
	let ogDescription = 'Browse every Pokémon TCG card with its Cardmarket price in euros. Filter by set, artist, rarity, type or Pokémon, and sort by price, name or Pokédex number.';
	let ogKeywords = ['Pokémon card list', 'Pokémon TCG cards', 'Pokémon card prices', 'Pokémon card search'];
	let ogCrumbs = breadcrumbs({ name: 'Cards', url: '/cards-list' });
	const ogSchemas: Record<string, unknown>[] = [];

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			/** A filtered grid is its own document for crawlers: same path, but its own title, description, image and schema. */
			const total = set.totalCards ?? set.printedTotal;
			const released = set.releaseDate ? new Date(set.releaseDate).getFullYear() : null;
			ogImage = { url: set.logo, alt: `${set.name} set logo` };
			ogTitle = `${set.name} Card List`;
			ogDescription = `Every card in the ${set.name} Pokémon TCG set${released ? `, released in ${released}` : ''}${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros and full filtering.`;
			ogKeywords = [`${set.name} card list`, `${set.name} set`, `${set.name} card prices`, 'Pokémon TCG'];
			ogCrumbs = breadcrumbs({ name: 'Sets', url: '/sets' }, { name: set.name, url: `/cards-list?set=${encodeURIComponent(set.name)}` });
			ogSchemas.push(setSchema(set));
		}
	}

	return {
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? parentImage,
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		schemas: ogSchemas,
		type: 'CollectionPage' as const,
	};
}
