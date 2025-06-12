import type { PageServerLoad } from './$types';
import type { Pokemon, FullCard, PriceData } from '~/lib/types';
import { getPokemons, getCards, getPrices } from '$helpers/supabase-data';

export const load: PageServerLoad = async () => {
	const [pokemons, allCards, prices] = await Promise.all([
		getPokemons(),
		getCards(),
		getPrices()
	]);

	const pokemonsWithCardCounts = pokemons.map(pokemon => {
		const cardCount = allCards.filter(card => card.pokemonNumber === pokemon.id).length;
		return { ...pokemon, cardCount };
	});

	return {
		pokemons: pokemonsWithCardCounts,
		allCards,
		prices
	};
}; 