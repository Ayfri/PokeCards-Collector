import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { breadcrumbs, cardListSchema, setSchema } from '$helpers/seo';

export const load: PageServerLoad = async ({ parent, url }) => {
	// Neither query depends on the layout, so they run alongside `getSets` instead of queuing behind `parent()`.
	const pageQueries = Promise.all([getPokemons(), getTypes()]);
	const parentLayoutData = await parent();
	const [pokemons, types] = await pageQueries;

	const sets = [...(parentLayoutData.sets || [])];
	sets.sort((a, b) => a.name.localeCompare(b.name));

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
			// A filtered grid is its own document: same path, different title, description, image and schema.
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

	// Everything the grid needs streams as one promise: the rarity and artist lists are derived from these cards
	// rather than read back from Postgres, which cost a full scan of `cards` each.
	const grid = (async () => {
		const [cards, prices] = await Promise.all([getCards(), getPrices()]);

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
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		schemas: ogSchemas,
		type: 'CollectionPage' as const,
	};
}
