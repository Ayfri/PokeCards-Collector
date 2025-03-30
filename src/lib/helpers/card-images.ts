import { env } from '$env/dynamic/public';
import type { FullCard } from '~/lib/types';

/**
 * Gets the image URL for a Pokémon
 * If CDN_URL environment variable is set, it will use that as the base URL
 * Otherwise it will use the original API URL
 *
 * @param pokemonId The ID of the Pokémon
 * @param cards The list of cards to search through
 * @returns The image URL to use
 */
export function getCardImageForPokemon(pokemonId: number, cards: FullCard[]): string {
	const pokemonCard = cards.find(c => c.pokemon.id === pokemonId);
	return pokemonCard ? getHighResCardImage(pokemonCard.image) : '/loading-spinner.svg';
}

/**
 * Gets the image URL for a card
 * If CDN_URL environment variable is set, it will use that as the base URL
 * Otherwise it will use the original API URL
 *
 * @param imageUrl The original image URL from the API
 * @returns The image URL to use
 */
export function getCardImage(imageUrl: string): string {
	const CDN_URL = env.PUBLIC_CARD_CDN_URL;

	// If no CDN URL is set, return the original URL
	if (!CDN_URL) {
		return imageUrl;
	}

	// Extract set code and card ID from the original URL
	// Example input: "https://images.pokemontcg.io/pop5/17_hires.png"
	const urlParts = imageUrl.split('/');
	if (urlParts.length < 2) {
		return imageUrl; // Invalid URL format, return original
	}

	const setCode = urlParts[urlParts.length - 2];
	const cardIdWithExt = urlParts[urlParts.length - 1];
	const cardId = cardIdWithExt.split('_')[0]; // Remove "_hires" part if present

	// Construct the CDN URL
	// Format: CDN_URL/setCode/cardId.png
	return `${CDN_URL}/${setCode}/${cardId}_hires.png`;
}

/**
 * Gets the high-resolution image URL for a card
 *
 * @param imageUrl The original image URL from the API
 * @returns The high-resolution image URL
 */
export function getHighResCardImage(imageUrl: string): string {
	// Check if the URL already contains "_hires"
	if (imageUrl.includes('_hires')) {
		return imageUrl;
	}

	// Insert "_hires" before the file extension
	const lastDotIndex = imageUrl.lastIndexOf('.');
	if (lastDotIndex === -1) {
		return imageUrl; // No file extension found, return original
	}

	return imageUrl.substring(0, lastDotIndex) + '_hires' + imageUrl.substring(lastDotIndex);
}
