import { getRarities, getTypes, getArtists, getPokemons, getCards } from '$helpers/supabase-data';
import type { FullCard } from '$lib/types'; // Import FullCard type
import type { PageServerLoad } from './$types'; // Added import for type

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentLayoutData = await parent(); // This is a promise to the layout's data

	// Fetch these potentially smaller lists directly if they are fast
	// If these are also slow, they should be part of the streamed object too.
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]);

	// Extract non-streamed data needed for immediate page setup.
	// Explicitly pick known, resolved fields from parentLayoutData.
	const otherLayoutData = {
		user: parentLayoutData.user,
		profile: parentLayoutData.profile,
		title: parentLayoutData.title, // SEO default from layout
		description: parentLayoutData.description, // SEO default from layout
		image: parentLayoutData.image, // SEO default from layout
		wishlistItems: parentLayoutData.wishlistItems,
		collectionItems: parentLayoutData.collectionItems
		// Note: parentLayoutData.sets is already resolved by the modified layout
	};
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

	return {
		...otherLayoutData,
		sets,
		pokemons,
		rarities,
		types,
		artists,
		streamed: {
			allCards: (async () => {
				// parentLayoutData is already resolved here.
				// Access the promise from parentLayoutData.streamed and await it.
				const cardsFromParent = await parentLayoutData.streamed.allCards;
				if (!cardsFromParent) return [];

				let allCardsResult: FullCard[] = cardsFromParent;
				const seenImages = new Set();
				allCardsResult = allCardsResult.filter(card => {
					if (!card.setName) return false;
					if (seenImages.has(card.image)) return false;
					seenImages.add(card.image);
					return true;
				});
				return allCardsResult;
			})(),
			prices: (async () => {
				const pricesFromParent = await parentLayoutData.streamed.prices;
				return pricesFromParent || {};
			})(),
			stats: (async () => {
				// Get real data counts from Supabase for accurate statistics
				const allCardsFromDb = await parentLayoutData.streamed.allCards;

				const pokemonCards = allCardsFromDb.filter(card => card.supertype === 'Pokémon');
				const trainerCards = allCardsFromDb.filter(card => card.supertype === 'Trainer');
				const energyCards = allCardsFromDb.filter(card => card.supertype === 'Energy');

				return {
					totalCards: allCardsFromDb.length, // Real count from database
					uniquePokemon: pokemons.length, // Real count from pokemons table
					pokemonCards: pokemonCards.length,
					trainerCards: trainerCards.length,
					energyCards: energyCards.length,
				};
			})()
		},
		title: ogTitle,
		description: ogDescription,
		image: ogImage ?? otherLayoutData.image,
	};
}
