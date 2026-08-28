import { getPokemons, getTypes } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	// Neither query depends on the layout, so they run alongside `getSets` instead of queuing behind `parent()`.
	const pageQueries = Promise.all([getPokemons(), getTypes()]);
	const parentLayoutData = await parent();
	const [pokemons, types] = await pageQueries;

	const sets = [...(parentLayoutData.sets || [])];
	sets.sort((a, b) => a.name.localeCompare(b.name));

	// Detect set filter in URL for SEO
	const setParam = url.searchParams.get('set');
	let ogImage = null;
	let ogTitle = 'All Pokémon Cards - PokéCards-Collector';
	let ogDescription = 'Browse all available Pokémon TCG cards.';

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			ogImage = { url: set.logo, alt: set.name };
			ogTitle = `${set.name} - PokéCards-Collector`;
			ogDescription = `Browse all cards from the set ${set.name}.`;
		}
	}

	// Everything the grid needs streams as one promise: the rarity and artist lists are derived from these cards
	// rather than read back from Postgres, which cost a full scan of `cards` each.
	const grid = (async () => {
		const [cards, prices] = await Promise.all([parentLayoutData.streamed.allCards, parentLayoutData.streamed.prices]);

		// An artless card is still a real card: deduplicating on `image` hid 1717 of them from the list.
		// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
		const visibleCards = ((cards ?? []) as FullCard[]).filter(card => Boolean(card.setName));

		return {
			artists: distinctArtists(visibleCards),
			cards: visibleCards,
			prices: prices ?? {},
			rarities: distinctRarities(visibleCards),
		};
	})();

	return {
		user: parentLayoutData.user,
		profile: parentLayoutData.profile,
		wishlistItems: parentLayoutData.wishlistItems,
		collectionItems: parentLayoutData.collectionItems,
		sets,
		pokemons,
		types,
		streamed: { grid },
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? parentLayoutData.image,
	};
}
