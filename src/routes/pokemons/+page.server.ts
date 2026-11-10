import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { getCards, getPokemons, getPrices } from '#helpers/supabase-data.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { BASE_URL, POKEMONS_COUNT } from '#src/constants.ts';
import { cardPath, cardPrice, memoizedOn, type CardLink } from '#helpers/card-utils.ts';
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
}

/** Keyed on the memoized tables: the pass over every card runs once per refreshed table instead of once per request. */
const aggregates = new WeakMap<object, unknown>();

const aggregatePokemons = (pokemons: Pokemon[], allCards: FullCard[], prices: Record<string, PriceData>) => memoizedOn(aggregates, [pokemons, allCards, prices], (): PokemonListEntry[] => {
	/** One pass over the 23546 cards: scanning all of them for each Pokémon would take 24M comparisons per render. */
	const best = new Map<number, { card: CardLink; count: number; image: string; price: number }>();
	for (const card of allCards) {
		const pokemonId = card.pokemonNumber;
		if (pokemonId === undefined) continue;

		const price = cardPrice(prices[card.cardCode]) ?? 0;
		const current = best.get(pokemonId);

		if (!current) {
			best.set(pokemonId, { card, count: 1, image: card.image, price });
			continue;
		}

		current.count++;
		if (price > current.price) {
			current.card = card;
			current.image = card.image;
			current.price = price;
		}
	}

	return pokemons.map(pokemon => {
		const entry = best.get(pokemon.id);
		return {
			cardCount: entry?.count ?? 0,
			fallbackImage: entry?.image ? processCardImage(entry.image) : '',
			id: pokemon.id,
			name: pokemon.name,
			path: entry ? cardPath('en', entry.card) : '',
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
		image: ogImage({ kind: 'page', name: 'pokemons' }, 'Every Pokémon and its cards on PokéCards-Collector, with the most valuable Pokémon cards'),
		title: 'All Pokémon and Their Cards',
		type: 'CollectionPage' as const,
	};
};
