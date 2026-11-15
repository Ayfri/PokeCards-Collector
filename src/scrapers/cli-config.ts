import {readFileSync} from 'node:fs';
import type {PublishSummary} from '#helpers/catalogue-snapshot.ts';
import type {Language} from '#helpers/catalogues.ts';
import {createSyncClient} from './supabase-sync';

/** CLI only: it reads `process.env`, which the Worker bundle never has. */
export const envClient = () => createSyncClient(process.env.PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '');

const SCRAPER_URL = process.env.SCRAPER_URL || 'https://pokecards-scraper.ayfri.workers.dev';

/**
 * Asks the scraper Worker to publish the catalogue snapshots from what Supabase holds now. The publisher runs there because only the scraper
 * Worker writes the bucket (the site Worker only reads it), so a CLI upload reaches the site through this call.
 */
export async function publishRemotely(): Promise<PublishSummary> {
	const token = process.env.SCRAPER_TRIGGER_TOKEN;
	if (!token) throw new Error('SCRAPER_TRIGGER_TOKEN is not set: Supabase holds the upload, but the site keeps serving the previous snapshot. Set it in .env and run `bun run scrapers publish`.');

	const response = await fetch(`${SCRAPER_URL}/publish`, {headers: {authorization: `Bearer ${token}`}, method: 'POST', signal: AbortSignal.timeout(600_000)});
	if (!response.ok) throw new Error(`Publish failed with status ${response.status}: ${await response.text()}`);
	return await response.json() as PublishSummary;
}

export const POKEMONS = 'src/assets/pokemons-full.json';
export const TYPES = 'src/assets/types.json';

export const FILES: Record<Language, {cards: string; prices: string; sets: string}> = {
	en: {cards: 'src/assets/cards-full.json', prices: 'src/assets/prices.json', sets: 'src/assets/sets-full.json'},
	fr: {cards: 'src/assets/fr-cards-full.json', prices: 'src/assets/fr-prices.json', sets: 'src/assets/fr-sets-full.json'},
	ja: {cards: 'src/assets/jp-cards-full.json', prices: 'src/assets/jp-prices.json', sets: 'src/assets/jp-sets-full.json'},
};

/** A staged JSON file of `src/assets/`. A missing file throws the `ENOENT` that names its path. */
export const readStaged = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
