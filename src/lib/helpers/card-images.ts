import {PUBLIC_NO_IMAGES} from '$app/env/public';
import {CARDTRADER_IMAGES} from '#src/constants.ts';
import type {FullCard} from '#lib/types.js';

export type ImageQuality = 'high' | 'low';

/** Dev switch: renders placeholders instead of card art so a local run costs no bandwidth. */
export const NO_IMAGES = PUBLIC_NO_IMAGES === 'true';

const PLACEHOLDER = 'https://placehold.co/300x450/transparent/transparent';

/** The scan of the first card depicting `pokemonId`, or an empty string when the list holds none. */
export function getCardImageForPokemon(pokemonId: number, cards: FullCard[]): string {
	const pokemonCard = cards.find(c => c.pokemonNumber === pokemonId);
	return pokemonCard ? processCardImage(pokemonCard.image) : '';
}

/**
 * Turns a stored image into a URL. A TCGdex extensionless base becomes `https://assets.tcgdex.net/en/swsh/swsh3/136` -> `.../136/high.webp`:
 * WebP is ~4x lighter than PNG, and the TCGdex CDN serves it over HTTP/3, so no mirror sits in front of it.
 * A CardTrader scan is a full URL with a file extension of its own: `low` is its `show_` variant (500 px), `high` the original (868 px).
 */
export function processCardImage(imageUrl: string, quality: ImageQuality = 'high'): string {
	if (NO_IMAGES) return PLACEHOLDER;
	if (imageUrl.startsWith(CARDTRADER_IMAGES)) return quality === 'low' ? imageUrl.replace(/[^/]+$/, 'show_$&') : imageUrl;
	return imageUrl ? `${imageUrl}/${quality}.webp` : '';
}

/** Intrinsic widths of the `low` and `high` URLs `processCardImage` returns, for `srcset` descriptors: the browser's DPR maths picks the wrong variant on any other number. */
export const scanWidths = (imageUrl: string): readonly [low: number, high: number] => imageUrl.startsWith(CARDTRADER_IMAGES) ? [500, 868] : [245, 600];

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
