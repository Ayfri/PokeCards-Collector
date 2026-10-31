import { countCards, getCards, getPokemons, getPrices } from '#helpers/supabase-data.ts';
import { cardListSchema, faqSchema } from '#helpers/seo.ts';
import type { FullCard } from '#lib/types.js';
import type { PageServerLoad } from './$types';
import { cardPrice } from '#helpers/card-utils.ts';

export const load: PageServerLoad = async ({ parent }) => {
	/** Started before `parent()` so the catalogue reads run in parallel with the layout's auth and collection queries. */
	const catalogue = Promise.all([getCards(), getPrices(), getPokemons(), countCards('ja'), countCards('fr')]);
	const { sets = [] } = await parent();
	const [allCardsResolved, pricesResolved, pokemons, japaneseCardCount, frenchCardCount] = await catalogue;

	/** Cards are not deduplicated on `image`: TCGdex gives each card its own art URL, so that would only drop the real cards it has no art for. */
	const processedAllCards = allCardsResolved.filter(card => Boolean(card.setName));

	const latestSet = [...sets].sort((a, b) => {
		const dateA = new Date(a.releaseDate).getTime();
		const dateB = new Date(b.releaseDate).getTime();
		return dateB - dateA;
	})[0];

	const latestSetCards = latestSet ? processedAllCards.filter(card => {
		const cardSetName = card.setName?.toLowerCase();
		return cardSetName === latestSet.name.toLowerCase();
	}) : [];

	const priceOf = (card: FullCard) => cardPrice(pricesResolved[card.cardCode]) ?? 0;
	/** One pass that keeps the five priciest in order: sorting the whole catalogue for them cost ~26 ms per render. */
	const topFive = (cards: FullCard[]) => {
		const top: { card: FullCard; price: number }[] = [];
		for (const card of cards) {
			const price = priceOf(card);
			const slot = top.findIndex(entry => price > entry.price);
			if (slot !== -1) top.splice(slot, 0, { card, price });
			else if (top.length < 5) top.push({ card, price });
			if (top.length > 5) top.pop();
		}
		/** The price is attached here because the prices table never reaches the browser, and the showcase rows print it. */
		return top.map(({ card, price }) => ({ ...card, price }));
	};

	const mostExpensiveLatestSetCards = topFive(latestSetCards);
	const mostExpensiveCards = topFive(processedAllCards);

	const latestSetStats = {
		energyCards: latestSetCards.filter(card => card.supertype === 'Energy').length,
		pokemonCards: latestSetCards.filter(card => card.supertype === 'Pokémon').length,
		totalValue: latestSetCards.reduce((sum, card) => sum + priceOf(card), 0),
		trainerCards: latestSetCards.filter(card => card.supertype === 'Trainer').length,
	};

	/** The real counts go into the description text, since answer engines can quote a number but not a vague claim. */
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
					answer: `The catalogue covers ${cardTotal} English cards across ${setTotal} sets, plus ${japaneseCardCount.toLocaleString('en-US')} Japanese and ${frenchCardCount.toLocaleString('en-US')} French cards, refreshed from TCGdex every day.`,
				},
				{
					question: 'Where do the Pokémon card prices come from?',
					answer: 'Every price is the Cardmarket value in euros, pulled from TCGdex and refreshed daily. Both the standard and the reverse-holo values are stored for each card.',
				},
				{
					question: 'Is PokéCards-Collector free?',
					answer: 'Yes. Browsing the catalogue needs no account, and tracking a collection, a wishlist and a binder only needs a free account.',
				},
				{
					question: 'Are Japanese Pokémon cards included?',
					answer: 'Yes. Japanese sets, cards and prices live under the /japan section with their own card pages.',
				},
				{
					question: 'Are French Pokémon cards included?',
					answer: 'Yes. French sets, cards and prices live under the /france section with their own card pages. A card with no French scan shows the English one.',
				},
			]),
		],
		title: 'PokéCards-Collector - Your Pokémon TCG Collection Manager',
	};

	/** The catalogue, prices and Pokédex stay on the server and the page gets only counts: sending them made the homepage a 24 MB document. `sets` comes from the layout. */
	return {
		latestSet,
		latestSetStats,
		mostExpensiveLatestSetCards,
		mostExpensiveCards,
		stats: {
			artists: new Set(allCardsResolved.map(card => card.artist).filter(Boolean)).size,
			foreignCards: { fr: frenchCardCount, ja: japaneseCardCount },
			totalCards: allCardsResolved.length,
			uniquePokemon: pokemons.length,
			pokemonCards: allCardsResolved.filter(card => card.supertype === 'Pokémon').length,
			trainerCards: allCardsResolved.filter(card => card.supertype === 'Trainer').length,
			energyCards: allCardsResolved.filter(card => card.supertype === 'Energy').length,
		},
		...pageSeoData
	};
}
