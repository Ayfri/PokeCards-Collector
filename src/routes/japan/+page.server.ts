import { getPokemons, getPrices, getRarities, getJapaneseSets, getTypes, getArtists, getJapaneseCards } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
  // Get layout data which contains default SEO values
  const layoutData = await parent();

  // Load all Japanese cards
  const allCards: FullCard[] = await getJapaneseCards();

  // Apply unique by image filter
  const seenImages = new Set();
  const filteredCards = allCards.filter(card => {
    if (!card.setName) return false;
    if (seenImages.has(card.image)) return false;
    seenImages.add(card.image);
    return true;
  });

  // Count different card types based on the loaded cards
  const pokemonCards = filteredCards.filter(card => card.supertype === 'Pokémon');
  const trainerCards = filteredCards.filter(card => card.supertype === 'Trainer');
  const energyCards = filteredCards.filter(card => card.supertype === 'Energy');

  // Count unique Pokemon based on the loaded cards
  const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;

  const pokemons = await getPokemons();
  const sets = await getJapaneseSets();
  const rarities = await getRarities();
  const types = await getTypes();
  const artists = await getArtists();
  const prices = await getPrices();

  // Sort sets alphabetically
  sets.sort((a, b) => a.name.localeCompare(b.name));

  // Detect set filter in URL
  const setParam = url.searchParams.get('set');
  let ogImage = null;
  let ogTitle = 'Japanese Pokémon Cards - Pokécards-collector';
  let ogDescription = 'Browse all Japanese Pokémon TCG cards. Filter by type, rarity, and more.';

  if (setParam) {
    const set = sets.find(s => s.name.toLowerCase() === setParam.toLowerCase());
    if (set) {
      ogImage = { url: set.logo, alt: set.name };
      ogTitle = `${set.name} - Pokécards-collector`;
      ogDescription = `Browse all cards from the Japanese set ${set.name}.`;
    }
  }

  return {
    ...layoutData, // Start with layout data (including its SEO defaults)
    allCards: filteredCards, // Return the loaded and filtered cards
    sets,
    rarities,
    types,
    artists,
    pokemons,
    prices,
    stats: {
      totalCards: filteredCards.length,
      uniquePokemon,
      pokemonCards: pokemonCards.length,
      trainerCards: trainerCards.length,
      energyCards: energyCards.length,
    },
    title: ogTitle,
    description: ogDescription,
    image: ogImage ?? layoutData.image,
  };
} 