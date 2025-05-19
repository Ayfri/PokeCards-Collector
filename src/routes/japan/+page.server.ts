import { getPokemons, getRarities, getJapaneseSets, getTypes, getArtists, getJapaneseCards } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { prices, ...layoutData } = await parent(); // layoutData includes SEO, user, profile etc.

  // Data that can be loaded quickly and is needed for SEO or initial page structure
  const [setsData, rarities, types, artists, pokemons] = await Promise.all([
    getJapaneseSets(), // Assuming this is relatively small metadata
    getRarities(),
    getTypes(),
    getArtists(),
    getPokemons()
  ]);

  const sets = setsData;
  sets.sort((a, b) => a.name.localeCompare(b.name));

  // SEO data determination
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

  // Promise for the large dataset (cards and their derived stats)
  const cardDataPromise = (async () => {
    const allCards: FullCard[] = await getJapaneseCards();

    const seenImages = new Set();
    const filteredCards = allCards.filter(card => {
      if (!card.setName) return false;
      if (seenImages.has(card.image)) return false;
      seenImages.add(card.image);
      return true;
    });

    const pokemonCards = filteredCards.filter(card => card.supertype === 'Pokémon');
    const trainerCards = filteredCards.filter(card => card.supertype === 'Trainer');
    const energyCards = filteredCards.filter(card => card.supertype === 'Energy');
    const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;

    return {
      allCards: filteredCards,
      stats: {
        totalCards: filteredCards.length,
        uniquePokemon,
        pokemonCards: pokemonCards.length,
        trainerCards: trainerCards.length,
        energyCards: energyCards.length,
      },
    };
  })(); // Immediately-invoked async function to create the promise

  return {
    ...layoutData, // from parent, includes its own SEO, user, profile
    streamed: {
        cardData: cardDataPromise // This will be streamed
    },
    // Non-streamed data for filters, SEO etc.
    sets,
    rarities,
    types,
    artists,
    pokemons,
    prices, // from parent
    // Page-specific SEO (can override layoutData's SEO)
    title: ogTitle,
    description: ogDescription,
    image: ogImage ?? layoutData.image, // Use page-specific image or fallback to layout's
  };
};
