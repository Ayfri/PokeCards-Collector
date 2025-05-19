import { getRarities, getTypes, getArtists, getPokemons } from '$helpers/data';
import type { FullCard } from '$lib/types'; // Import FullCard type
import type { PageServerLoad } from './$types'; // Added import for type

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentDataPromise = parent(); // Don't await the full parent yet

	// Fetch these potentially smaller lists directly if they are fast
	// If these are also slow, they should be part of the streamed object too.
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]);

	// Await parent data to get sets and layoutData for immediate use (SEO, basic structure)
	// allCards and prices will be handled via the promise
	const { allCards: layoutAllCards, sets: layoutSets, prices: layoutPrices, ...layoutData } = await parentDataPromise;

	const sets = [...layoutSets]; // Create a mutable copy for sorting
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

	return {
		...layoutData, // Start with layout data (including its SEO defaults)
		sets,          // Sets are resolved and sent for immediate use
		pokemons,      // Assuming these are resolved and fast enough
		rarities,
		types,
		artists,
		// Streamed data
		streamed: {
			allCards: (async () => {
				let allCardsResult: FullCard[] = layoutAllCards; // Use the already fetched layoutAllCards
				const seenImages = new Set();
				allCardsResult = allCardsResult.filter(card => {
					if (!card.setName) return false;
					if (seenImages.has(card.image)) return false;
					seenImages.add(card.image);
					return true;
				});
				return allCardsResult;
			})(),
			prices: (async () => layoutPrices)(), // Stream prices from layout
			stats: (async () => {
				// Use layoutAllCards as it's resolved when this promise is created
				let cardsForStats: FullCard[] = layoutAllCards;
				const seenImages = new Set(); // Ensure consistent filtering
				cardsForStats = cardsForStats.filter(card => {
					if (!card.setName) return false;
					if (seenImages.has(card.image)) return false;
					seenImages.add(card.image);
					return true;
				});

				const pokemonCards = cardsForStats.filter(card => card.supertype === 'Pokémon');
				const trainerCards = cardsForStats.filter(card => card.supertype === 'Trainer');
				const energyCards = cardsForStats.filter(card => card.supertype === 'Energy');
				const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;
				return {
					totalCards: cardsForStats.length,
					uniquePokemon,
					pokemonCards: pokemonCards.length,
					trainerCards: trainerCards.length,
					energyCards: energyCards.length,
				};
			})()
		},
		// SEO related data, should be available immediately
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? layoutData.image, // Use specific ogImage or fallback to layout's
	};
}
