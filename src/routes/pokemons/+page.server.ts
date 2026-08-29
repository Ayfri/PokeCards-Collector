import type { PageServerLoad } from './$types';
import { getCards, getPokemons, getPrices } from '$helpers/supabase-data';
import { processCardImage } from '$helpers/card-images';
import { breadcrumbs } from '$helpers/seo';
import { POKEMONS_COUNT } from '~/constants';

/**
 * What one grid tile needs. The page used to ship `cards` and `prices` whole - ~14 MB of JSON for 1025 tiles
 * that only read a count, a link target and a fallback scan - so the two tables stay on the server now.
 */
export interface PokemonListEntry {
	cardCode: string;
	cardCount: number;
	fallbackImage: string;
	id: number;
	name: string;
}

export const load: PageServerLoad = async () => {
	const [pokemons, allCards, prices] = await Promise.all([getPokemons(), getCards(), getPrices()]);

	// One pass over the 23546 cards, against a full scan per Pokémon before, which was 24M comparisons a render.
	const best = new Map<number, { cardCode: string; count: number; image: string; price: number }>();
	for (const card of allCards) {
		const pokemonId = card.pokemonNumber;
		if (pokemonId === undefined) continue;

		const price = prices[card.cardCode]?.simple ?? prices[card.cardCode]?.trend ?? 0;
		const current = best.get(pokemonId);

		if (!current) {
			best.set(pokemonId, { cardCode: card.cardCode, count: 1, image: card.image, price });
			continue;
		}

		current.count++;
		if (price > current.price) {
			current.cardCode = card.cardCode;
			current.image = card.image;
			current.price = price;
		}
	}

	const entries: PokemonListEntry[] = pokemons.map(pokemon => {
		const entry = best.get(pokemon.id);
		return {
			cardCode: entry?.cardCode ?? '',
			cardCount: entry?.count ?? 0,
			fallbackImage: entry?.image ? processCardImage(entry.image) : '',
			id: pokemon.id,
			name: pokemon.name,
		};
	});

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
				url: entry.cardCode ? `/card/${entry.cardCode}` : undefined,
			})),
			name: 'Pokémon covered by the Pokémon TCG',
			numberOfItems: entries.length,
		}],
		title: 'All Pokémon and Their Cards',
		type: 'CollectionPage' as const,
	};
};
