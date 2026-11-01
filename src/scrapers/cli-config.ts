import type {Language} from '#helpers/catalogues.ts';
import {createSyncClient} from './supabase_sync';

/** CLI only: it reads `process.env`, which the Worker bundle never has. */
export const envClient = () => createSyncClient(process.env.PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '');

export const POKEMONS = 'src/assets/pokemons-full.json';
export const TYPES = 'src/assets/types.json';

export const FILES: Record<Language, {cards: string; prices: string; sets: string}> = {
	en: {cards: 'src/assets/cards-full.json', prices: 'src/assets/prices.json', sets: 'src/assets/sets-full.json'},
	fr: {cards: 'src/assets/fr-cards-full.json', prices: 'src/assets/fr-prices.json', sets: 'src/assets/fr-sets-full.json'},
	ja: {cards: 'src/assets/jp-cards-full.json', prices: 'src/assets/jp-prices.json', sets: 'src/assets/jp-sets-full.json'},
};
