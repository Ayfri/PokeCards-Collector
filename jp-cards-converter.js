import { readFileSync, writeFileSync } from 'fs';

// Read the Japanese card data
const jpCardsData = JSON.parse(readFileSync('./src/assets/jp_cards_data.json', 'utf8'));

// Read the Pokemon data to get Pokemon numbers
const pokemonsData = JSON.parse(readFileSync('./src/assets/pokemons-full.json', 'utf8'));

// Create maps for efficient lookups
const pokemonNameToNumber = {};
const pokemonNamesSet = new Set();
const pokemonNamesList = [];

// Prepare the Pokémon data for efficient lookups
pokemonsData.forEach(pokemon => {
  const name = pokemon.name.toLowerCase();
  pokemonNameToNumber[name] = pokemon.id;
  pokemonNamesSet.add(name);
  pokemonNamesList.push(name);
});

// Sort Pokémon names by length (descending) to prioritize longer matches
pokemonNamesList.sort((a, b) => b.length - a.length);

// Function to find any Pokémon name contained within the card name
function findPokemonInCardName(cardName) {
  if (!cardName) return null;
  
  const lowerCardName = cardName.toLowerCase();
  
  // First try direct match if it's in the database
  if (pokemonNamesSet.has(lowerCardName)) {
    return lowerCardName;
  }
  
  // Handle "'s X" pattern first
  if (lowerCardName.includes("'s ")) {
    const afterPossessive = lowerCardName.split("'s ")[1].trim();
    
    // Check if the part after "'s" is a valid Pokémon name
    if (pokemonNamesSet.has(afterPossessive)) {
      return afterPossessive;
    }
  }
  
  // Remove common prefixes for "Dark X", "Light X", etc.
  const commonPrefixes = ['dark ', 'light ', 'shiny ', 'shadow ', 'rocket\'s ', 'team rocket\'s '];
  for (const prefix of commonPrefixes) {
    if (lowerCardName.startsWith(prefix)) {
      const withoutPrefix = lowerCardName.substring(prefix.length);
      if (pokemonNamesSet.has(withoutPrefix)) {
        return withoutPrefix;
      }
    }
  }
  
  // Try to find any Pokémon name within the card name (prioritizing longer names)
  for (const pokemonName of pokemonNamesList) {
    // Check if the card name contains this Pokémon name as a whole word
    // Using word boundary checks to avoid matching substrings
    const regex = new RegExp(`\\b${pokemonName}\\b`, 'i');
    if (regex.test(lowerCardName)) {
      return pokemonName;
    }
  }
  
  // If we get here, no matching Pokémon name was found
  return null;
}

// Function to create a card code based on available data
function createCardCode(card, pokemonNumber) {
  if (!pokemonNumber) {
    // If we couldn't find the Pokemon number, use a placeholder
    return `unknown_card_${card.card_number?.replace('/', '_') || 'unknown'}`;
  }
  
  // Extract set code
  const setCode = card.set_code?.toLowerCase() || '';
  
  // Extract card number
  const cardNumber = card.card_number?.split('/')[0] || '';
  
  // Ensure we don't have empty segments by using fallbacks
  const formattedSetCode = setCode || 'unknown_set';
  const formattedCardNumber = cardNumber || 'unknown_number';
  
  return `pokemon_${pokemonNumber}_${formattedSetCode}_${formattedCardNumber}`;
}

// Transform Japanese card data to the desired format
const transformedCards = jpCardsData.map(card => {
  // Extract the Pokemon name
  const pokemonName = findPokemonInCardName(card.name);
  
  // Look up the Pokemon number
  const pokemonNumber = pokemonName ? pokemonNameToNumber[pokemonName] : null;
  
  // Generate the card code
  const cardCode = createCardCode(card, pokemonNumber);
  
  // Hard-code the supertype based on the card_type
  let supertype = '';
  if (card.card_type && card.card_type.includes('Pok')) {
    supertype = 'Pokémon';
  } else if (card.card_type === 'Trainer') {
    supertype = 'Trainer';
  } else if (card.card_type === 'Energy') {
    supertype = 'Energy';
  } else {
    supertype = card.card_type || '';
  }
  
  // Map to the desired output format
  return {
    artist: card.illustrator || '', 
    cardCode: cardCode,
    cardMarketUpdatedAt: '2025/04/24', // Use placeholder date
    cardMarketUrl: card.url || '',
    image: card.image_url || '',
    meanColor: 'FFFFFF', // Default value
    name: card.name || '',
    pokemonNumber: pokemonNumber || null,
    rarity: card.rarity || '',
    setName: card.set_name || '',
    supertype: supertype,
    types: card.pokemon_type || '',
  };
});

// Write the transformed data to a new file using a directly encoded JSON string
const jsonOutput = JSON.stringify(transformedCards, null, 2)
  .replace(/PokÃ©mon/g, 'Pokémon'); // Fix encoding issues in the output
  
writeFileSync('./src/assets/jp-cards-full.json', jsonOutput);

console.log(`Converted ${transformedCards.length} Japanese cards to new format.`); 