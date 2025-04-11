import { env } from '$env/dynamic/public';
import type { FullCard } from '$lib/types';
import { NO_IMAGES } from '~/constants';

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
	const pokemonCard = cards.find(c => c.pokemonNumber === pokemonId);
	return pokemonCard ? processCardImage(pokemonCard.image) : '/loading-spinner.svg';
}

/**
 * Centralized function to process all card images
 * Handles CDN configurations, NO_IMAGES mode, and high-res options
 * 
 * @param imageUrl The original image URL from the API
 * @param highRes Whether to use high-resolution images (default: true)
 * @returns The processed image URL
 */
export function processCardImage(imageUrl: string, highRes: boolean = true): string {
	const CDN_URL = env.PUBLIC_CARD_CDN_URL;

	// Check for NO_IMAGES mode
	if (NO_IMAGES) {
		return "https://placehold.co/300x450/transparent/transparent";
	}

	// If no CDN URL is set, handle high-res if needed
	if (!CDN_URL) {
		return highRes ? getHighResCardImage(imageUrl) : imageUrl;
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
	return `${CDN_URL}/${setCode}/${cardId}${highRes ? '_hires' : ''}.png`;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use processCardImage instead
 */
export function getCardImage(imageUrl: string): string {
	return processCardImage(imageUrl);
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
