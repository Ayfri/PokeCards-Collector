/**
 * Utilities for card manipulation and identification
 */

/**
 * Generate a standardized unique card code that can be used consistently 
 * across the application for identification
 */
export function generateUniqueCardCode(
  pokemonId: number | string, 
  setCode: string | undefined, 
  cardNumber: string | undefined,
  supertype: string = 'pokemon'
): string {
  // Normalize supertype: lowercase, no spaces, no accents, no special characters
  const normalizedSupertype = (supertype || 'pokemon')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, '');
  
  // Ensure it's "pokemon" for Pokémon with accent
  const finalSupertype = normalizedSupertype === "pokmon" ? "pokemon" : normalizedSupertype;
  
  // Normalize set code
  const normalizedSetCode = (setCode || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, '');
  
  // Normalize card number
  const normalizedCardNumber = (cardNumber || '')
    .replace(/[^a-z0-9]/g, '');
  
  // Generate unique code in format: supertype_pokemonid_setcode_cardnumber
  return `${finalSupertype}_${pokemonId}_${normalizedSetCode}_${normalizedCardNumber}`;
}

/**
 * Parse a card code from a card image URL
 */
export function parseCardCodeFromImage(imageUrl: string): { setCode?: string, cardNumber?: string } {
  if (!imageUrl) return { setCode: undefined, cardNumber: undefined };
  
  const parts = imageUrl.split('/');
  
  // Try to extract set code from second-to-last part of URL
  const setCode = parts.length >= 2 ? parts.at(-2) : undefined;
  
  // Try to extract card number from filename
  let cardNumber: string | undefined = undefined;
  const filename = parts.at(-1);
  if (filename) {
    // Extract the first part before underscore and remove any letters
    const match = filename.split('_')[0].match(/[a-z]*(\d+)[a-z]*/i);
    cardNumber = match ? match[1] : undefined;
  }
  
  return { setCode, cardNumber };
} 