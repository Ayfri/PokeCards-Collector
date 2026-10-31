import type {Language} from '$lib/helpers/catalogues';

export const CARDS ='src/assets/cards-full.json';
export const FR_CARDS = 'src/assets/fr-cards-full.json';
export const FR_PRICES = 'src/assets/fr-prices.json';
export const FR_SETS = 'src/assets/fr-sets-full.json';
export const JP_CARDS = 'src/assets/jp-cards-full.json';
export const JP_PRICES = 'src/assets/jp-prices.json';
export const JP_SETS = 'src/assets/jp-sets-full.json';
export const POKEMONS = 'src/assets/pokemons-full.json';
export const PRICES = 'src/assets/prices.json';
export const SETS = 'src/assets/sets-full.json';
export const TYPES = 'src/assets/types.json';

/** The scraped JSON files of each catalogue. */
export const FILES: Record<Language, {cards: string; prices: string; sets: string}> = {
	en: {cards: CARDS, prices: PRICES, sets: SETS},
	fr: {cards: FR_CARDS, prices: FR_PRICES, sets: FR_SETS},
	ja: {cards: JP_CARDS, prices: JP_PRICES, sets: JP_SETS},
};
