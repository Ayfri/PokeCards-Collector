import { getPokemons, getJapaneseSets, getTypes, getJapaneseCards, getJapanesePrices } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { breadcrumbs, setSchema } from '$helpers/seo';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();

	// Japanese cards have their own cardmarket prices, keyed by the same card codes.
	const pricesResolved = await getJapanesePrices();

	const layoutDataFromParent = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	const [japaneseSetsData, types, pokemons] = await Promise.all([
		getJapaneseSets(),
		getTypes(),
		getPokemons()
	]);

	const sets = japaneseSetsData;
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

	const cardDataPromise = (async () => {
		const allCards: FullCard[] = await getJapaneseCards();

		// An artless card is still a real card: deduplicating on `image` hid 8899 of the 12781 Japanese cards.
		// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
		const filteredCards = allCards.filter(card => Boolean(card.setName));

		const pokemonCards = filteredCards.filter(card => card.supertype === 'Pokémon');
		const trainerCards = filteredCards.filter(card => card.supertype === 'Trainer');
		const energyCards = filteredCards.filter(card => card.supertype === 'Energy');
		const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;

		return {
			allCards: filteredCards,
			// Derived from the Japanese cards themselves; reading them from `cards` listed rarities and artists this page never shows.
			artists: distinctArtists(filteredCards),
			rarities: distinctRarities(filteredCards),
			stats: {
				totalCards: filteredCards.length,
				uniquePokemon,
				pokemonCards: pokemonCards.length,
				trainerCards: trainerCards.length,
				energyCards: energyCards.length,
			},
		};
	})();

	return {
		...layoutDataFromParent,
		streamed: {
			cardData: cardDataPromise
		},
		sets,
		types,
		pokemons,
		prices: pricesResolved,
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? layoutDataFromParent.image,
		breadcrumbs: ogCrumbs,
		keywords: ogKeywords,
		schemas: ogSchemas,
		type: 'CollectionPage' as const,
	};
};
