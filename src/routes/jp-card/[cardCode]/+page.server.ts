import { getPokemons, getPrices, getSets, getJapaneseCards } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { cardCode } = params;
  const layoutData = await parent();

  // Load all Japanese cards
  const allCards = await getJapaneseCards();
  
  // Find the specific card
  const card = allCards.find(c => c.cardCode === cardCode);
  
  if (!card) {
    throw error(404, 'Card not found');
  }
  
  // Get Pokémon data
  const pokemons = await getPokemons();
  const pokemon = pokemons.find(p => p.id === card.pokemonNumber);
  
  // Get all cards for this Pokémon (if it's a Pokémon card)
  let pokemonCards: FullCard[] = [];
  if (card.pokemonNumber) {
    pokemonCards = allCards.filter(c => c.pokemonNumber === card.pokemonNumber);
  }
  
  // Get prices and sets
  const prices = await getPrices();
  const sets = await getSets();
  
  // Page-specific SEO data
  const pageSeoData = {
    title: `${card.name} - Japanese Card - Pokécards-collector`,
    description: `View details for the Japanese Pokémon card ${card.name} from the ${card.setName} set.`,
    image: card.image
  };
  
  return {
    ...layoutData,
    card,
    pokemon,
    allCards,
    pokemonCards,
    pokemons,
    sets,
    prices,
    ...pageSeoData
  };
}; 