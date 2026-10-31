import type { FullCard, Pokemon, PriceData } from '$lib/types';

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

	// Normalize card number the same way as the set code, so "H7" and "7" stay distinct cards
	const normalizedCardNumber = (cardNumber || '')
		.toLowerCase()
		.normalize("NFD").replace(/[̀-ͯ]/g, "") // Remove accents
		.replace(/[^a-z0-9]/g, '');

	// Generate unique code in format: supertype_pokemonid_setcode_cardnumber
	return `${finalSupertype}_${pokemonId}_${normalizedUrlCode}_${normalizedCardNumber}`;
}

/** A card's price in EUR: the Cardmarket average, else its trend, 30-day average or lowest listing. `null` when none is above 0. */
export function cardPrice(price: PriceData | undefined): number | null {
	const value = price?.simple ?? price?.trend ?? price?.avg30 ?? price?.low ?? null;
	return value && value > 0 ? value : null;
}

/**
 * The number as printed: uppercase like the card ("TG01", "R"), over the set total only when it is a plain number.
 * A lettered one sits outside that count: the 30th Celebration Mews read "R/RGB", never "R/128".
 */
export function formatCardNumber(cardNumber: string, printedTotal?: number | null): string {
	const number = cardNumber.toUpperCase();
	return printedTotal && /^\d+$/.test(number) ? `${number}/${printedTotal}` : number;
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
	return [...filteredCards].sort((a, b) => (cardPrice(prices[b.cardCode]) ?? 0) - (cardPrice(prices[a.cardCode]) ?? 0))[0];
}

/**
 * The slice of the catalogue a card page reads: the cards, Pokédex rows and prices of the card's Pokémon, its dex
 * neighbours and two evolution stages either way, plus the page's sibling cards. Whole tables made it an 11.5 MB document.
 */
export function cardPageCatalogue(pokemonNumber: number | undefined, siblings: FullCard[], allCards: FullCard[], pokemons: Pokemon[], prices: Record<string, PriceData>) {
	const ids = new Set<number>();
	if (pokemonNumber) {
		const byId = new Map(pokemons.map(pokemon => [pokemon.id, pokemon]));
		const current = byId.get(pokemonNumber);
		ids.add(pokemonNumber - 1).add(pokemonNumber).add(pokemonNumber + 1);

		const pre = current?.evolves_from;
		if (pre) ids.add(pre);
		const prePre = pre ? byId.get(pre)?.evolves_from : undefined;
		if (prePre) ids.add(prePre);

		for (const evolution of current?.evolves_to ?? []) {
			ids.add(evolution);
			for (const further of byId.get(evolution)?.evolves_to ?? []) ids.add(further);
		}
	}

	const siblingCodes = new Set(siblings.map(card => card.cardCode));
	const cards = allCards.filter(card => siblingCodes.has(card.cardCode) || (card.pokemonNumber !== undefined && ids.has(card.pokemonNumber)));

	return {
		allCards: cards,
		pokemons: pokemons.filter(pokemon => ids.has(pokemon.id)),
		prices: Object.fromEntries(cards.flatMap(card => prices[card.cardCode] ? [[card.cardCode, prices[card.cardCode]]] : [])) as Record<string, PriceData>,
	};
}
