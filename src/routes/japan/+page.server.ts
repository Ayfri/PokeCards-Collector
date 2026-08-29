import { getJapaneseSets } from '$helpers/supabase-data';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setSchema } from '$helpers/seo';

/**
 * SEO only: the cards, prices, pokemons and types the grid needs come from `/api/japan-cards` through `+page.ts`.
 * This load reads `?set=`, so SvelteKit reruns it on every set filter change and re-sends whatever it returns.
 */
export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();

	const layoutDataFromParent = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	const sets = await getJapaneseSets();
	sets.sort((a, b) => a.name.localeCompare(b.name));

	const setParam = url.searchParams.get('set');
	let ogImage = null;
	let ogTitle = 'Japanese Pokémon Cards';
	let ogDescription = `Browse Japanese Pokémon TCG cards across ${sets.length} Japanese sets, with Cardmarket prices in euros. Filter by set, type, rarity or artist.`;
	let ogKeywords = ['Japanese Pokémon cards', 'Japanese Pokémon TCG', 'Japanese Pokémon card prices', 'Japanese Pokémon sets'];
	let ogCrumbs = breadcrumbs({ name: 'Japanese cards', url: '/japan' });
	const ogSchemas: Record<string, unknown>[] = [];

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			const total = set.totalCards ?? set.printedTotal;
			ogImage = { url: set.logo, alt: `${set.name} Japanese set logo` };
			ogTitle = `${set.name} - Japanese Card List`;
			ogDescription = `Every card in the Japanese Pokémon TCG set ${set.name}${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.`;
			ogKeywords = [`${set.name} japanese set`, `${set.name} card list`, 'Japanese Pokémon TCG'];
			ogCrumbs = breadcrumbs({ name: 'Japanese cards', url: '/japan' }, { name: set.name, url: `/japan?set=${encodeURIComponent(set.name)}` });
			ogSchemas.push(setSchema(set, '/japan'));
		}
	}

	return {
		...layoutDataFromParent,
		sets,
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? layoutDataFromParent.image,
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		schemas: ogSchemas,
		type: 'CollectionPage' as const,
	};
};
