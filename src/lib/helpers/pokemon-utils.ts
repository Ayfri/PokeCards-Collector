import type { FullCard, Pokemon, PriceData } from '~/lib/types';
import { processCardImage } from '$helpers/card-images';
import { NO_IMAGES } from '$lib/images';

/**
 * Gets the image source for a Pokémon.
 * Always tries the official artwork first.
 * @param pokemonId The ID of the Pokémon.
 * @returns The URL of the Pokémon image.
 */
export function getPokemonImageSrc(pokemonId: number): string {
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Handles errors when loading a Pokémon's image.
 * Attempts to fall back to a card image if the official artwork fails.
 * @param event The error event.
 * @param pokemonId The ID of the Pokémon.
 * @param pokemonCards Array of Pokémon cards to search for a fallback image.
 */
export function handlePokemonImageError(event: Event, pokemonId: number, pokemonCards: FullCard[]): void {
	const img = event.currentTarget as HTMLImageElement;
	const pokemonCard = pokemonCards.find(c => c.pokemonNumber === pokemonId);

	if (img.classList.contains('fallback-attempted')) {
		img.src = '/loading-spinner.svg'; // Fallback to spinner if everything fails
		img.onerror = null; // Prevent infinite loop
		return;
	}

	img.classList.add('fallback-attempted');

	if (pokemonCard && pokemonCard.image) {
		img.src = processCardImage(pokemonCard.image);
	} else {
		// If no card image, try sprite (though official artwork is usually preferred)
		// If sprites also fail, this will re-trigger onerror and hit the 'fallback-attempted' condition
		img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
	}
}

/**
 * Finds the most expensive card for a given Pokémon ID.
 * @param pokemonId The ID of the Pokémon.
 * @param allCards A list of all available cards.
 * @param prices A record of card prices.
 * @returns The most expensive FullCard object for the Pokémon, or undefined if no cards are found.
 */
export function getMostExpensiveCardForPokemon(pokemonId: number, allCards: FullCard[], prices: Record<string, PriceData>): FullCard | undefined {
	const cardsForPokemon = allCards.filter(card => card.pokemonNumber === pokemonId);

	if (cardsForPokemon.length === 0) {
		return undefined;
	}

	return cardsForPokemon.reduce((mostExpensive, currentCard) => {
		const mostExpensivePrice = prices[mostExpensive.cardCode]?.simple ?? prices[mostExpensive.cardCode]?.trend ?? 0;
		const currentPrice = prices[currentCard.cardCode]?.simple ?? prices[currentCard.cardCode]?.trend ?? 0;
		return currentPrice > mostExpensivePrice ? currentCard : mostExpensive;
	}, cardsForPokemon[0]);
} 