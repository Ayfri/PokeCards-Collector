import { getPokemons, getJapaneseSets, getTypes, getJapaneseCards, getJapanesePrices } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent(); // Get the full parent data structure

	// Japanese cards have their own cardmarket prices, keyed by the same card codes.
	const pricesResolved = await getJapanesePrices();

	// Extract other necessary layout data (e.g., user, profile, default SEO from parent)
	const layoutDataFromParent = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title, // Parent's default title
		description: parentData.description, // Parent's default description
		image: parentData.image, // Parent's default image
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
		// parentData.sets are global sets, this page uses getJapaneseSets()
		// parentData.streamed.allCards are global cards, this page uses getJapaneseCards()
	};

	// Data specific to this page (Japanese sets, rarities, types, etc.)
	const [japaneseSetsData, types, pokemons] = await Promise.all([
		getJapaneseSets(),
		getTypes(),
		getPokemons()
	]);

	const sets = japaneseSetsData; // Rename for clarity, these are Japanese sets
	sets.sort((a, b) => a.name.localeCompare(b.name));

	// SEO data determination for this page
	const setParam = url.searchParams.get('set');
	let ogImage = null;
	let ogTitle = 'Japanese Pokémon Cards - Pokécards-collector';
	let ogDescription = 'Browse all Japanese Pokémon TCG cards. Filter by type, rarity, and more.';

	if (setParam) {
		const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
		if (set) {
			ogImage = { url: set.logo, alt: set.name };
			ogTitle = `${set.name} - Pokécards-collector`;
			ogDescription = `Browse all cards from the Japanese set ${set.name}.`;
		}
	}

	// Promise for the large dataset (Japanese cards and their derived stats)
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
		...layoutDataFromParent, // User, profile, SEO defaults from parent
		streamed: {
			cardData: cardDataPromise // Streamed Japanese card data and stats
		},
		// Non-streamed data specific to this page or resolved from parent
		sets, // Japanese sets
		types,
		pokemons,
		prices: pricesResolved,
		// Page-specific SEO (overrides parent's defaults if set)
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? layoutDataFromParent.image, // Use page-specific image or fallback to parent's default
	};
};
