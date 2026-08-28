import {env} from '$env/dynamic/public';
import {NO_IMAGES} from '$lib/images';
import type {FullCard} from '$lib/types';

export type ImageQuality = 'high' | 'low';
export type ImageExtension = 'webp' | 'png';

const PLACEHOLDER = 'https://placehold.co/300x450/transparent/transparent';

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
 * Turns a TCGdex extensionless image base into a real URL.
 * `https://assets.tcgdex.net/en/swsh/swsh3/136` -> `.../136/high.webp`, which is ~4x lighter than the
 * PNG the old pipeline served. `PUBLIC_CARD_CDN_URL` swaps the host for an R2 mirror keyed the same way,
 * and `NO_IMAGES` returns a placeholder so dev runs cost no bandwidth.
 */
export function processCardImage(imageUrl: string, quality: ImageQuality = 'high', extension: ImageExtension = 'webp'): string {
	if (NO_IMAGES) return PLACEHOLDER;
	if (!imageUrl) return '';

	const CDN_URL = env.PUBLIC_CARD_CDN_URL;
	if (!CDN_URL) return `${imageUrl}/${quality}.${extension}`;

	// TCGdex bases end in `/{lang}/{serie}/{setId}/{localId}`; the mirror is keyed by set and card.
	const parts = imageUrl.split('/');
	const localId = parts.at(-1);
	const setId = parts.at(-2);
	if (!localId || !setId) return `${imageUrl}/${quality}.${extension}`;

	return `${CDN_URL}/${setId}/${localId}/${quality}.${extension}`;
}
