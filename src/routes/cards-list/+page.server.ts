import { getCards, getRarities, getSets, getTypes, getArtists, getPokemons, getPrices } from '$helpers/data';
import type { FullCard } from '$lib/types'; // Import FullCard type
import type { PageServerLoad } from './$types'; // Added import for type

export const load: PageServerLoad = async ({ parent, url }) => {
	// Get layout data which contains default SEO values
	const layoutData = await parent();

	// Load all cards here instead of layout
	let allCards: FullCard[] = await getCards();

	// Apply unique by image filter (moved from layout)
	const seenImages = new Set();
	allCards = allCards.filter(card => {
		if (!card.setName) return false;
		if (seenImages.has(card.image)) return false;
		seenImages.add(card.image);
		return true;
	});

	// Count different card types based on the loaded cards
	const pokemonCards = allCards.filter(card => card.supertype === 'Pokémon');
	const trainerCards = allCards.filter(card => card.supertype === 'Trainer');
	const energyCards = allCards.filter(card => card.supertype === 'Energy');

	// Count unique Pokemon based on the loaded cards
	const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;

	const pokemons = await getPokemons();
	const sets = await getSets();
	const rarities = await getRarities();
	const types = await getTypes();
	const artists = await getArtists();
	const prices = await getPrices();

	// Trier les sets par ordre alphabétique
	sets.sort((a, b) => a.name.localeCompare(b.name));

	// Detect set filter in URL
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
		allCards, // Return the loaded and filtered cards
		sets,
		rarities,
		types,
		artists,
		pokemons,
		prices,
		stats: {
			totalCards: allCards.length,
			uniquePokemon,
			pokemonCards: pokemonCards.length,
			trainerCards: trainerCards.length,
			energyCards: energyCards.length,
		},
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? layoutData.image,
	};
}
