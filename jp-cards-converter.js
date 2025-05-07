import { readFileSync, writeFileSync } from 'fs';

// Read the Japanese card data
const jpCardsData = JSON.parse(readFileSync('./src/assets/jp_cards_data.json', 'utf8'));

// Read the Pokemon data to get Pokemon numbers
const pokemonsData = JSON.parse(readFileSync('./src/assets/pokemons-full.json', 'utf8'));

// Create a map of Pokemon names to their numbers for quick lookup
const pokemonNameToNumber = {};
pokemonsData.forEach(pokemon => {
  // Store name in lowercase for case-insensitive matching
  pokemonNameToNumber[pokemon.name.toLowerCase()] = pokemon.id;
});

// Function to extract Pokemon name from card name
function extractPokemonName(cardName) {
  // Handle special cases like "Team Rocket's Tarountula"
  if (cardName.includes("'s ")) {
    return cardName.split("'s ")[1].toLowerCase();
  }
  // For regular Pokemon names
  return cardName.toLowerCase();
}

// Function to create a card code based on available data
function createCardCode(card, pokemonNumber) {
  if (!pokemonNumber) {
    // If we couldn't find the Pokemon number, use a placeholder
    return `unknown_card_${card.card_number.replace('/', '_')}`;
  }
  
  // Extract set code
  const setCode = card.set_code?.toLowerCase() || '';
  
  // Extract card number
  const cardNumber = card.card_number?.split('/')[0] || '';
  
  return `pokemon_${pokemonNumber}_${setCode}_${cardNumber}`;
}

// Transform Japanese card data to the desired format
const transformedCards = jpCardsData.map(card => {
  // Extract the Pokemon name
  const rawPokemonName = card.name;
  const pokemonName = extractPokemonName(rawPokemonName);
  
  // Look up the Pokemon number
  const pokemonNumber = pokemonNameToNumber[pokemonName] || null;
  
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
  .replace(/Pok\\u00C3\\u00A9mon/g, 'Pokémon'); // Fix encoding issues in the output
  
writeFileSync('./src/assets/jp-cards-full.json', jsonOutput);

console.log(`Converted ${transformedCards.length} Japanese cards to new format.`); 