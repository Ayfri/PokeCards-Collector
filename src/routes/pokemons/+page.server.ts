import type { PageServerLoad } from './$types';
import { getCards, getPokemons, getPrices } from '$helpers/supabase-data';
import { processCardImage } from '$helpers/card-images';

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

	return { pokemons: entries };
};
