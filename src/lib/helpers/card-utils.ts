import type { FullCard, PriceData } from '$lib/types';

/**
 * Utilities for card manipulation and identification
 */

/**
 * Generate a standardized unique card code that can be used consistently
 * across the application for identification
 */
export function generateUniqueCardCode(
	pokemonId: number | string,
	urlCode: string | undefined,
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
	const normalizedUrlCode = (urlCode || '')
		.toLowerCase()
		.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/[^a-z0-9]/g, '');

	// Normalize card number
	const normalizedCardNumber = (cardNumber || '')
		.replace(/[^a-z0-9]/g, '');

	// Generate unique code in format: supertype_pokemonid_setcode_cardnumber
	return `${finalSupertype}_${pokemonId}_${normalizedUrlCode}_${normalizedCardNumber}`;
}

export function parseCardCode(cardCode: string): { supertype?: string, setCode?: string, pokemonNumber?: number, cardNumber?: string } {
	if (!cardCode || typeof cardCode !== 'string') {
		return {
			cardNumber: undefined,
			pokemonNumber: undefined,
			setCode: undefined,
			supertype: undefined,
		};
	}

	try {
		const parts = cardCode.split('_');
		
		// Handle case where we don't have enough parts
		if (parts.length < 4) {
			return {
				cardNumber: parts[3] || undefined,
				pokemonNumber: parts[1] ? parseInt(parts[1]) : undefined,
				setCode: parts[2] || undefined,
				supertype: parts[0] || undefined,
			};
		}
		
		// Normal case
		return {
			cardNumber: parts[3],
			pokemonNumber: isNaN(parseInt(parts[1])) ? undefined : parseInt(parts[1]),
			setCode: parts[2],
			supertype: parts[0],
		};
	} catch (error) {
		console.error('Error parsing card code:', error, cardCode);
		return {
			cardNumber: undefined,
			pokemonNumber: undefined,
			setCode: undefined,
			supertype: undefined,
		};
	}
}

/**
 * Checks if a given string matches the expected cardCode format.
 * Assumes card codes contain underscores and URLs generally don't in relevant parts.
 */
export function isCardCode(item: string): boolean {
	if (!item) return false;
	// Basic check: Does it contain underscores, which are part of our cardCode format?
	// And does it NOT start with http, which indicates a URL?
	return item.includes('_') && !item.startsWith('http');
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

/**
 * Helper function to get a representative card for a Pokemon
 * @param pokemonId The ID of the Pokemon
 * @param allCards Array of all cards to search within
 * @param prices Record of card prices to determine the most valuable card
 */
export function getRepresentativeCardForPokemon(pokemonId: number, allCards: FullCard[], prices: Record<string, PriceData>): FullCard | undefined {
	// Find all cards for this Pokemon
	const filteredCards = allCards.filter(c => c.pokemonNumber === pokemonId);
	if (filteredCards.length === 0) return undefined;

	// Sort by price (highest first) and return the first one
	return [...filteredCards].sort((a, b) => (prices[b.cardCode]?.simple ?? 0) - (prices[a.cardCode]?.simple ?? 0))[0];
}
