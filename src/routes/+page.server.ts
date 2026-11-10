import { countCards, getCards, getPokemons, getPrices, getSets } from '#helpers/supabase-data.ts';
import { cardListSchema, faqSchema } from '#helpers/seo.ts';
import type { FullCard, PriceData, Set as CardSet } from '#lib/types.js';
import type { PageServerLoad } from './$types';
import { cardPrice, memoizedOn } from '#helpers/card-utils.ts';
import { getRarityLevel, RARITY_MAPPING } from '#helpers/rarity.ts';

/** Page 2 holds 5 cards, so the preview reads as a binder in progress. */
const BINDER_PAGE_SLOTS = 9;
const BINDER_PREVIEW_SIZE = BINDER_PAGE_SLOTS + 5;

interface CatalogueHome {
	artists: number;
	binderPreview: { cardCode: string; id: string; position: number; url: string }[];
	latestSet: CardSet;
	latestSetStats: { energyCards: number; pokemonCards: number; totalValue: number; trainerCards: number };
	mostExpensiveCards: FullCard[];
	mostExpensiveLatestSetCards: FullCard[];
}

/**
 * Keyed on the memoized tables like `grid-payload.ts`: the pass over the ~23.5k cards runs once per refreshed table, not once per request,
 * and no entry keeps a replaced table alive.
 */
const homes = new WeakMap<object, unknown>();

const catalogueHome = (cards: FullCard[], prices: Record<string, PriceData>, sets: CardSet[]) => memoizedOn(homes, [cards, prices, sets], () => buildHome(cards, prices, sets));

function buildHome(cards: FullCard[], prices: Record<string, PriceData>, sets: CardSet[]): CatalogueHome {
	/** Cards are not deduplicated on `image`: TCGdex gives each card its own art URL, so that would only drop the real cards it has no art for. */
	const processedAllCards = cards.filter(card => Boolean(card.setName));

	/** `sets[0]` seeds the reduce and is `undefined` only when there are no sets, where the callback never runs. */
	const latestSet = sets.reduce((latest, set) => new Date(set.releaseDate) > new Date(latest.releaseDate) ? set : latest, sets[0]);

	const latestSetCards = latestSet ? processedAllCards.filter(card => {
		const cardSetName = card.setName?.toLowerCase();
		return cardSetName === latestSet.name.toLowerCase();
	}) : [];

	const priceOf = (card: FullCard) => cardPrice(prices[card.cardCode]) ?? 0;
	/** One pass that keeps the five priciest in order: sorting the whole catalogue for them cost ~26 ms per render. */
	const topFive = (list: FullCard[]) => {
		const top: { card: FullCard; price: number }[] = [];
		for (const card of list) {
			const price = priceOf(card);
			const slot = top.findIndex(entry => price > entry.price);
			if (slot !== -1) top.splice(slot, 0, { card, price });
			else if (top.length < 5) top.push({ card, price });
			if (top.length > 5) top.pop();
		}
		/** The price is attached here because the prices table never reaches the browser, and the showcase rows print it. */
		return top.map(({ card, price }) => ({ ...card, price }));
	};

	const minRarityLevel = RARITY_MAPPING['ultra rare'];
	const releaseTime = new Map(sets.map(set => [set.setId, new Date(set.releaseDate).getTime()]));
	/**
	 * Rare cards (ultra rare and above) with a scan of their own, never one that borrows art. The newest sets come first, the rarest
	 * first inside a set, so the latest set fills the binder and older sets only complete it. Rarity levels and prices are read once
	 * per card before the sort, and only the filtered cards are sorted.
	 */
	const binderPreview = processedAllCards
		.flatMap(card => {
			const level = getRarityLevel(card.rarity);
			return card.image && level >= minRarityLevel ? [{ card, level, price: priceOf(card) }] : [];
		})
		.sort((a, b) => (releaseTime.get(b.card.setId) ?? 0) - (releaseTime.get(a.card.setId) ?? 0) || b.level - a.level || b.price - a.price)
		.slice(0, BINDER_PREVIEW_SIZE)
		.map(({ card }, index) => ({ cardCode: card.cardCode, id: card.cardCode, position: index % BINDER_PAGE_SLOTS, url: card.image }));

	const home: CatalogueHome = {
		artists: new Set(cards.map(card => card.artist).filter(Boolean)).size,
		binderPreview,
		latestSet,
		latestSetStats: {
			energyCards: latestSetCards.filter(card => card.supertype === 'Energy').length,
			pokemonCards: latestSetCards.filter(card => card.supertype === 'Pokémon').length,
			totalValue: latestSetCards.reduce((sum, card) => sum + priceOf(card), 0),
			trainerCards: latestSetCards.filter(card => card.supertype === 'Trainer').length,
		},
		mostExpensiveCards: topFive(processedAllCards),
		mostExpensiveLatestSetCards: topFive(latestSetCards),
	};
	return home;
}

export const load: PageServerLoad = async () => {
	const [allCardsResolved, pricesResolved, pokemons, japaneseCardCount, frenchCardCount, sets] = await Promise.all([getCards(), getPrices(), getPokemons(), countCards('ja'), countCards('fr'), getSets()]);

	const { artists, binderPreview, latestSet, latestSetStats, mostExpensiveCards, mostExpensiveLatestSetCards } = catalogueHome(allCardsResolved, pricesResolved, sets);

	/** The real counts go into the description text, since answer engines can quote a number but not a vague claim. */
	const cardTotal = allCardsResolved.length.toLocaleString('en-US');
	const setTotal = sets.length.toLocaleString('en-US');

	const pageSeoData = {
		description: `Browse ${cardTotal} Pokémon TCG cards across ${setTotal} sets with live Cardmarket prices in euros. Track your collection, build a wishlist, plan a binder and play two card guessing games, all for free.`,
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

	/** The catalogue, prices, Pokédex and set list stay on the server and the page gets only counts: sending them made the homepage a 24 MB document. */
	return {
		binderPreview,
		latestSet,
		latestSetStats,
		mostExpensiveLatestSetCards,
		mostExpensiveCards,
		setCount: sets.length,
		stats: {
			artists,
			foreignCards: { fr: frenchCardCount, ja: japaneseCardCount },
			totalCards: allCardsResolved.length,
			uniquePokemon: pokemons.length,
		},
		...pageSeoData
	};
}
