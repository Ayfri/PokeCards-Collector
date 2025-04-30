import { getCards, getSets, getPokemons, getPrices } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
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
	const prices = await getPrices();

	// Get latest set based on release date
	const latestSet = [...sets].sort((a, b) => {
		const dateA = new Date(a.releaseDate).getTime();
		const dateB = new Date(b.releaseDate).getTime();
		return dateB - dateA;
	})[0];

	// Filter cards from the latest set
	const latestSetCards = allCards.filter(card => {
		// Check if the card belongs to the latest set
		const cardSetName = card.setName?.toLowerCase();
		return cardSetName === latestSet.name.toLowerCase();
	});

	// Get the most expensive cards from the latest set
	const mostExpensiveLatestSetCards = [...latestSetCards]
		.sort((a, b) => {
			const priceA = prices[a.cardCode]?.simple || prices[a.cardCode]?.trend || 0;
			const priceB = prices[b.cardCode]?.simple || prices[b.cardCode]?.trend || 0;
			return priceB - priceA;
		})
		.slice(0, 5); // Get top 5 most expensive cards
	
	const mostExpensiveCards = [...allCards]
		.sort((a, b) => {
			const priceA = prices[a.cardCode]?.simple || prices[a.cardCode]?.trend || 0;
			const priceB = prices[b.cardCode]?.simple || prices[b.cardCode]?.trend || 0;
			return priceB - priceA;
		})
		.slice(0, 5); // Get top 5 most expensive cards

	// Define page-specific SEO data
	const pageSeoData = {
		title: 'PokéStore - Votre référence Pokémon TCG',
		description: 'Explorez l\'univers des cartes Pokémon. Découvrez le dernier set, consultez les prix des cartes les plus rares et gérez votre collection.'
	};

	return {
		...layoutData,
		allCards,
		latestSet,
		mostExpensiveLatestSetCards,
		mostExpensiveCards,
		sets,
		pokemons,
		prices,
		stats: {
			totalCards: allCards.length,
			uniquePokemon,
			pokemonCards: pokemonCards.length,
			trainerCards: trainerCards.length,
			energyCards: energyCards.length,
		},
		...pageSeoData
	};
}
