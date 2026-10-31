import {NO_IMAGES} from '$lib/images';
import type {FullCard} from '$lib/types';

export type ImageQuality = 'high' | 'low';
export type ImageExtension = 'webp' | 'png';

const PLACEHOLDER = 'https://placehold.co/300x450/transparent/transparent';

/** The scan of the first card depicting `pokemonId`, or an empty string when the list holds none. */
export function getCardImageForPokemon(pokemonId: number, cards: FullCard[]): string {
	const pokemonCard = cards.find(c => c.pokemonNumber === pokemonId);
	return pokemonCard ? processCardImage(pokemonCard.image) : '';
}

/**
 * Turns a TCGdex extensionless image base into a URL: `https://assets.tcgdex.net/en/swsh/swsh3/136` -> `.../136/high.webp`.
 * WebP is ~4x lighter than PNG, and the TCGdex CDN serves it over HTTP/3, so no mirror sits in front of it.
 */
export function processCardImage(imageUrl: string, quality: ImageQuality = 'high', extension: ImageExtension = 'webp'): string {
	if (NO_IMAGES) return PLACEHOLDER;
	return imageUrl ? `${imageUrl}/${quality}.${extension}` : '';
}

/** The energy names `src/styles/colors.css` declares a `--<type>` / `--<type>2` pair for. */
const TYPE_COLORS = new Set(['colorless', 'darkness', 'dragon', 'fairy', 'fighting', 'fire', 'grass', 'lightning', 'metal', 'psychic', 'water']);

/**
 * Inline `--tint-a` / `--tint-b` for a card with no art. The energy types are already in the payload, so the
 * placeholder needs no extra column and no image. Empty when the card has no known type.
 */
export function cardTypeTint(types: string | undefined): string {
	const names = (types ?? '').toLowerCase().split(',').map(name => name.trim()).filter(name => TYPE_COLORS.has(name));
	if (!names.length) return '';
	return `--tint-a: var(--${names[0]}); --tint-b: var(--${names[1] ?? names[0]}2)`;
}
