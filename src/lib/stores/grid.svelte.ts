import { Persisted } from './persisted.svelte';

export interface CardGridSize {
	name: string;
	width: number;
}

export const CARD_SIZES: Record<number, CardGridSize> = {
	0.75: { name: 'S', width: 180 },
	1: { name: 'M', width: 280 },
	2: { name: 'L', width: 380 },
	3: { name: 'XL', width: 500 },
};

export const DEFAULT_CARD_SIZE = 1;

/** Width preset of the card grid, one of the `CARD_SIZES` keys. */
export const cardSize = new Persisted('card-size', DEFAULT_CARD_SIZE);
if (!(cardSize.current in CARD_SIZES)) cardSize.current = DEFAULT_CARD_SIZE;

/** Scroll position of the card grid, 0-100. Fed by VirtualGrid, which computes it from sizes it already tracks. */
class GridScroll {
	progress = $state(0);
}

export const gridScroll = new GridScroll();
