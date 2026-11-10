import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { getCards, getPokemons, getPrices } from '#helpers/supabase-data.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { BASE_URL, POKEMONS_COUNT } from '#src/constants.ts';
import { type CardLink, cardPath, cardPrice, memoizedOn } from '#helpers/card-utils.ts';
import type { FullCard, Pokemon, PriceData } from '#lib/types.js';

/**
 * What one grid tile needs. The tiles only read a count, a link target and a fallback scan, so `cards` and `prices` stay
 * on the server: sending them whole is ~14 MB of JSON for 1025 tiles.
 */
export interface PokemonListEntry {
	cardCount: number;
	fallbackImage: string;
	id: number;
	name: string;
	/** The page of the Pokémon's most valuable card, empty when it has none. */
	path: string;
	/** Cardmarket price of that card in EUR, 0 when no card of the Pokémon is priced. */
	price: number;
	/** The Pokémon's main TCG type, lowercase: the first type of most of its cards, empty when it has no card. */
	type: string;
}

/** Keyed on the memoized tables: the pass over every card runs once per refreshed table instead of once per request. */
const aggregates = new WeakMap<object, unknown>();

/** The type a card is filed under: the first of its comma-separated types. */
const mainTypeOf = (card: FullCard) => card.types.split(',', 1)[0]?.trim().toLowerCase() ?? '';

/** The most frequent type; a tie goes to the type of the most valuable card, then to the first one met. */
function mainType(counts: Map<string, number>, bestType: string): string {
	let main = '';
	for (const [type, count] of counts) {
		const mainCount = counts.get(main) ?? 0;
		if (count > mainCount || (count === mainCount && type === bestType)) main = type;
	}
	return main;
}

const aggregatePokemons = (pokemons: Pokemon[], allCards: FullCard[], prices: Record<string, PriceData>) => memoizedOn(aggregates, [pokemons, allCards, prices], (): PokemonListEntry[] => {
	/** One pass over the 23546 cards: scanning all of them for each Pokémon would take 24M comparisons per render. */
	const best = new Map<number, { bestType: string; card: CardLink; count: number; image: string; price: number; types: Map<string, number> }>();
	for (const card of allCards) {
		const pokemonId = card.pokemonNumber;
		if (pokemonId === undefined) continue;

		const price = cardPrice(prices[card.cardCode]) ?? 0;
		const type = mainTypeOf(card);
		let current = best.get(pokemonId);

		if (!current) {
			current = { bestType: type, card, count: 0, image: card.image, price, types: new Map() };
			best.set(pokemonId, current);
		} else if (price > current.price) {
			current.bestType = type;
			current.card = card;
			current.image = card.image;
			current.price = price;
		}

		current.count++;
		if (type) current.types.set(type, (current.types.get(type) ?? 0) + 1);
	}

	return pokemons.map(pokemon => {
		const entry = best.get(pokemon.id);
		return {
			cardCount: entry?.count ?? 0,
			fallbackImage: entry?.image ? processCardImage(entry.image) : '',
			id: pokemon.id,
			name: pokemon.name,
			path: entry ? cardPath('en', entry.card) : '',
			price: entry ? Math.round(entry.price * 100) / 100 : 0,
			type: entry ? mainType(entry.types, entry.bestType) : '',
		};
	});
});

export const load: PageServerLoad = async () => {
	const [pokemons, allCards, prices] = await Promise.all([getPokemons(), getCards(), getPrices()]);
	const entries = aggregatePokemons(pokemons, allCards, prices);

	const withCards = entries.filter(entry => entry.cardCount > 0).length;

	return {
		breadcrumbs: breadcrumbs({ name: 'Pokémon', url: '/pokemons' }),
		description: `Every one of the ${POKEMONS_COUNT} Pokémon and the TCG cards that depict them. ${withCards} of them have at least one card in the catalogue - open any Pokémon to see its full card list with prices.`,
		image: ogImage({ kind: 'page', name: 'pokemons' }, 'Every Pokémon and its cards on PokéCards-Collector, with the most valuable Pokémon cards'),
		keywords: ['Pokémon list', 'Pokémon cards by Pokémon', 'Pokédex TCG', 'all Pokémon cards'],
		pokemons: entries,
		schemas: [{
			'@type': 'ItemList',
			itemListElement: entries.slice(0, 50).map((entry, index) => ({
				'@type': 'ListItem',
				name: entry.name,
				position: index + 1,
				url: entry.path ? `${BASE_URL}${entry.path}` : undefined,
			})),
			name: 'Pokémon covered by the Pokémon TCG',
			numberOfItems: entries.length,
		}],
		title: 'All Pokémon and Their Cards',
		type: 'CollectionPage' as const,
	};
};
