import { readFileSync, writeFileSync } from 'fs';

// Read the Japanese card data with proper UTF-8 handling
let jpCardsData;
try {
  const jpCardsRawData = readFileSync('./src/assets/jp_cards_data.json', 'utf8');
  jpCardsData = JSON.parse(jpCardsRawData);
  console.log(`Successfully loaded ${jpCardsData.length} Japanese cards`);
} catch (error) {
  console.error('Error loading jp_cards_data.json:', error);
  process.exit(1);
}

// Read the Pokemon data to get Pokemon numbers
let pokemonsData;
try {
  const pokemonsRawData = readFileSync('./src/assets/pokemons-full.json', 'utf8');
  pokemonsData = JSON.parse(pokemonsRawData);
  console.log(`Successfully loaded ${pokemonsData.length} Pokémon data entries`);
} catch (error) {
  console.error('Error loading pokemons-full.json:', error);
  process.exit(1);
}

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
  
  // Handle "'s X" pattern first (e.g., "Rocket's Zapdos")
  if (lowerCardName.includes("'s ")) {
    const afterPossessive = lowerCardName.split("'s ")[1]?.trim();
    
    // Check if the part after "'s" is a valid Pokémon name
    if (afterPossessive && pokemonNamesSet.has(afterPossessive)) {
      return afterPossessive;
    }
  }
  
  // Remove common prefixes/suffixes
  const commonPrefixes = ['dark ', 'light ', 'shiny ', 'shadow ', 'rocket\'s ', 'team rocket\'s '];
  for (const prefix of commonPrefixes) {
    if (lowerCardName.startsWith(prefix)) {
      const withoutPrefix = lowerCardName.substring(prefix.length);
      if (pokemonNamesSet.has(withoutPrefix)) {
        return withoutPrefix;
      }
    }
  }
  
  // Handle suffixes like "-EX", "-GX", etc.
  const suffixRegex = /-[a-z]+$/i;
  if (suffixRegex.test(lowerCardName)) {
    const withoutSuffix = lowerCardName.replace(suffixRegex, '').trim();
    if (pokemonNamesSet.has(withoutSuffix)) {
      return withoutSuffix;
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
  
  // Extract set code and ensure it's not empty
  const setCode = card.set_code?.toLowerCase()?.trim() || 'unknown_set';
  
  // Extract card number and ensure it's not empty
  const cardNumber = card.card_number?.split('/')[0]?.trim() || 'unknown_number';
  
  return `pokemon_${pokemonNumber}_${setCode}_${cardNumber}`;
}

// Function to properly encode/decode text with special characters
function fixEncoding(text) {
  if (!text) return '';
  
  return text
    .replace(/PokÃ©mon/g, 'Pokémon')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û');
}

// Transform Japanese card data to the desired format
const transformedCards = jpCardsData.map(card => {
  // Fix encoding issues in card name and other text fields
  const fixedName = fixEncoding(card.name);
  
  // Extract the Pokemon name
  const pokemonName = findPokemonInCardName(fixedName);
  
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
    supertype = fixEncoding(card.card_type) || '';
  }
  
  // Map to the desired output format
  return {
    artist: fixEncoding(card.illustrator) || '', 
    cardCode: cardCode,
    cardMarketUpdatedAt: '2025/04/24', // Use placeholder date
    cardMarketUrl: card.url || '',
    image: card.image_url || '',
    meanColor: 'FFFFFF', // Default value
    name: fixedName || '',
    pokemonNumber: pokemonNumber || null,
    rarity: fixEncoding(card.rarity) || '',
    setName: fixEncoding(card.set_name) || '',
    supertype: supertype,
    types: fixEncoding(card.pokemon_type) || '',
  };
});

try {
  // Write the transformed data to a new file
  const jsonOutput = JSON.stringify(transformedCards, null, 2);
  writeFileSync('./src/assets/jp-cards-full.json', jsonOutput);
  console.log(`Converted ${transformedCards.length} Japanese cards to new format.`);
  
  // Log some stats to verify the conversion
  const pokemonCards = transformedCards.filter(card => card.supertype === 'Pokémon');
  const trainerCards = transformedCards.filter(card => card.supertype === 'Trainer');
  const energyCards = transformedCards.filter(card => card.supertype === 'Energy');
  const unknownCards = transformedCards.filter(card => !card.pokemonNumber && card.supertype === 'Pokémon');
  
  console.log(`Stats:
  - Pokémon cards: ${pokemonCards.length}
  - Trainer cards: ${trainerCards.length}
  - Energy cards: ${energyCards.length}
  - Pokémon cards with unknown number: ${unknownCards.length}
  `);
} catch (error) {
  console.error('Error writing jp-cards-full.json:', error);
} 