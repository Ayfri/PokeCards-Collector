import { getPokemons, getPrices, getRarities, getSets, getTypes, getArtists } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom helper to load Japanese cards
async function getJapaneseCards(): Promise<FullCard[]> {
  try {
    const filePath = path.join(process.cwd(), 'src', 'assets', 'jp-cards-full.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading Japanese cards:', error);
    return [];
  }
}

export const load: PageServerLoad = async ({ parent }) => {
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
  const sets = await getSets();
  const rarities = await getRarities();
  const types = await getTypes();
  const artists = await getArtists();
  const prices = await getPrices();

  // Sort sets alphabetically
  sets.sort((a, b) => a.name.localeCompare(b.name));

  // Define page-specific SEO data
  const pageSeoData = {
    title: 'Japanese Pokémon Cards - PokéStore',
    description: 'Browse all Japanese Pokémon TCG cards. Filter by type, rarity, and more.'
  };

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
    ...pageSeoData, // Override with page-specific SEO data
  };
} 