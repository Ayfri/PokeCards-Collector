import { getPokemons, getCards, getJapaneseCards } from '$helpers/supabase-data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get layout data. Parent data now has { streamed: { allCards: Promise, prices: Promise }, sets, user, profile ... }
	const parentData = await parent();

	// Await the streamed promises from parent for allCards and prices
	const allCardsResolved: FullCard[] = await parentData.streamed.allCards || []; // Ensure it's an array
	const pricesResolved = await parentData.streamed.prices || {};      // Ensure it's an object

	// 'sets' is already resolved from parent
	const sets = parentData.sets || [];

	// Extract other necessary layout data (e.g., user, profile, default SEO)
	// Avoid spreading `streamed` or properties already handled (allCards, prices, sets)
	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	// Use the resolved allCards for further processing
	let processedAllCards: FullCard[] = [...allCardsResolved];

	// Apply unique by image filter
	const seenImages = new Set();
	processedAllCards = processedAllCards.filter(card => {
		if (!card.setName) return false;
		if (seenImages.has(card.image)) return false;
		seenImages.add(card.image);
		return true;
	});

	// Get real data counts from Supabase for statistics
	const [pokemons, allCardsFromDb, japaneseCards] = await Promise.all([
		getPokemons(),
		allCardsResolved,
		getJapaneseCards() // Get Japanese cards count
	]);

	// Get latest set based on release date
	const latestSet = [...sets].sort((a, b) => {
		const dateA = new Date(a.releaseDate).getTime();
		const dateB = new Date(b.releaseDate).getTime();
		return dateB - dateA;
	})[0];

	// Filter cards from the latest set
	const latestSetCards = latestSet ? processedAllCards.filter(card => {
		const cardSetName = card.setName?.toLowerCase();
		return cardSetName === latestSet.name.toLowerCase();
	}) : [];

	// Get the most expensive cards from the latest set
	const mostExpensiveLatestSetCards = [...latestSetCards]
		.sort((a, b) => {
			const priceA = pricesResolved[a.cardCode]?.simple || pricesResolved[a.cardCode]?.trend || 0;
			const priceB = pricesResolved[b.cardCode]?.simple || pricesResolved[b.cardCode]?.trend || 0;
			return priceB - priceA;
		})
		.slice(0, 5); // Get top 5 most expensive cards

	const mostExpensiveCards = [...processedAllCards]
		.sort((a, b) => {
			const priceA = pricesResolved[a.cardCode]?.simple || pricesResolved[a.cardCode]?.trend || 0;
			const priceB = pricesResolved[b.cardCode]?.simple || pricesResolved[b.cardCode]?.trend || 0;
			return priceB - priceA;
		})
		.slice(0, 5); // Get top 5 most expensive cards

	// Define page-specific SEO data
	const pageSeoData = {
		title: 'PokéCards-Collector - Your Pokémon TCG Collection Manager',
		description: 'Explore the Pokémon TCG universe. Discover the latest set, check out the prices of the rarest cards, and manage your collection.'
	};

	return {
		...layoutData,
		allCards: processedAllCards, // Send the processed, unique-by-image cards
		latestSet,
		mostExpensiveLatestSetCards,
		mostExpensiveCards,
		sets,
		pokemons,
		prices: pricesResolved, // Send the resolved prices
		stats: {
			totalCards: allCardsFromDb.length, // Real count from database
			totalJapaneseCards: japaneseCards.length, // Real count from database
			uniquePokemon: pokemons.length, // Real count from pokemons table
			pokemonCards: allCardsFromDb.filter(card => card.supertype === 'Pokémon').length,
			trainerCards: allCardsFromDb.filter(card => card.supertype === 'Trainer').length,
			energyCards: allCardsFromDb.filter(card => card.supertype === 'Energy').length,
		},
		...pageSeoData
	};
}
