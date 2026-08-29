import { countJapaneseCards, getCards, getPokemons, getPrices } from '$helpers/supabase-data';
import { cardListSchema, faqSchema } from '$helpers/seo';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const [allCardsResolved, pricesResolved] = await Promise.all([getCards(), getPrices()]);

	const sets = parentData.sets || [];

	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	let processedAllCards: FullCard[] = [...allCardsResolved];

	// An artless card is still a real card: deduplicating on `image` silently dropped every one of them.
	// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
	processedAllCards = processedAllCards.filter(card => Boolean(card.setName));

	const [pokemons, japaneseCardCount] = await Promise.all([
		getPokemons(),
		countJapaneseCards()
	]);

	const latestSet = [...sets].sort((a, b) => {
		const dateA = new Date(a.releaseDate).getTime();
		const dateB = new Date(b.releaseDate).getTime();
		return dateB - dateA;
	})[0];

	const latestSetCards = latestSet ? processedAllCards.filter(card => {
		const cardSetName = card.setName?.toLowerCase();
		return cardSetName === latestSet.name.toLowerCase();
	}) : [];

	const priceOf = (card: FullCard) => pricesResolved[card.cardCode]?.simple || pricesResolved[card.cardCode]?.trend || 0;
	const topFive = (cards: FullCard[]) => [...cards]
		.sort((a, b) => priceOf(b) - priceOf(a))
		.slice(0, 5)
		// The showcase rows print a price, and the catalogue no longer travels with the page for them to look it up.
		.map(card => ({ ...card, price: priceOf(card) }));

	const mostExpensiveLatestSetCards = topFive(latestSetCards);
	const mostExpensiveCards = topFive(processedAllCards);

	const latestSetStats = {
		energyCards: latestSetCards.filter(card => card.supertype === 'Energy').length,
		pokemonCards: latestSetCards.filter(card => card.supertype === 'Pokémon').length,
		totalValue: latestSetCards.reduce((sum, card) => sum + (pricesResolved[card.cardCode]?.simple || 0), 0),
		trainerCards: latestSetCards.filter(card => card.supertype === 'Trainer').length,
	};

	// The counts are read back into the copy so the description states real numbers rather than a vague claim,
	// which is what an answer engine can actually quote.
	const cardTotal = allCardsResolved.length.toLocaleString('en-US');
	const setTotal = sets.length.toLocaleString('en-US');

	const pageSeoData = {
		description: `Browse ${cardTotal} Pokémon TCG cards across ${setTotal} sets with live Cardmarket prices in euros. Track your collection, build a wishlist, plan a binder and play two daily card games, all for free.`,
		keywords: ['Pokémon TCG', 'Pokémon card prices', 'Pokémon card collection tracker', 'Pokémon card list', 'Cardmarket prices'],
		schemas: [
			cardListSchema(mostExpensiveCards, '/cards-list?sortby=sort-price&sortorder=desc', 'Most expensive Pokémon cards', 5),
			faqSchema([
				{
					question: 'How many Pokémon cards can I browse on PokéCards-Collector?',
					answer: `The catalogue covers ${cardTotal} English cards across ${setTotal} sets, plus ${japaneseCardCount.toLocaleString('en-US')} Japanese cards, refreshed from TCGdex every week.`,
				},
				{
					question: 'Where do the Pokémon card prices come from?',
					answer: 'Every price is the Cardmarket value in euros, pulled from TCGdex and refreshed weekly. Both the standard and the reverse-holo values are stored for each card.',
				},
				{
					question: 'Is PokéCards-Collector free?',
					answer: 'Yes. Browsing the catalogue needs no account, and tracking a collection, a wishlist and a binder only needs a free account.',
				},
				{
					question: 'Are Japanese Pokémon cards included?',
					answer: 'Yes. Japanese sets, cards and prices live under the /japan section with their own card pages.',
				},
			]),
		],
		title: 'PokéCards-Collector - Your Pokémon TCG Collection Manager',
	};

	// Neither the catalogue nor the prices reach the browser: everything the page prints is counted here, and
	// shipping them made the homepage a 24 MB document.
	return {
		...layoutData,
		latestSet,
		latestSetStats,
		mostExpensiveLatestSetCards,
		mostExpensiveCards,
		sets,
		pokemons,
		stats: {
			artists: new Set(allCardsResolved.map(card => card.artist).filter(Boolean)).size,
			totalCards: allCardsResolved.length,
			totalJapaneseCards: japaneseCardCount,
			uniquePokemon: pokemons.length,
			pokemonCards: allCardsResolved.filter(card => card.supertype === 'Pokémon').length,
			trainerCards: allCardsResolved.filter(card => card.supertype === 'Trainer').length,
			energyCards: allCardsResolved.filter(card => card.supertype === 'Energy').length,
		},
		...pageSeoData
	};
}
