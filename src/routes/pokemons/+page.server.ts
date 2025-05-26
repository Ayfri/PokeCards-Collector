import type { PageServerLoad } from './$types';
import type { Pokemon, FullCard, PriceData } from '~/lib/types';
import pokemonsData from '~/assets/pokemons-full.json';
import allCardsData from '~/assets/cards-full.json';
import pricesData from '~/assets/prices.json';

export const load: PageServerLoad = async () => {
	const pokemons: Pokemon[] = pokemonsData as Pokemon[];
	const allCards: FullCard[] = allCardsData as FullCard[];
	const prices: Record<string, PriceData> = pricesData as Record<string, PriceData>;

	const pokemonsWithCardCounts = pokemons.map(pokemon => {
		const cardCount = allCards.filter(card => (<any>card).pokemonNumber === pokemon.id).length;
		return { ...pokemon, cardCount };
	});

	return {
		pokemons: pokemonsWithCardCounts,
		allCards,
		prices
	};
}; 