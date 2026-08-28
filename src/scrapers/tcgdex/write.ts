import * as fs from 'node:fs/promises';
import {Http2Pool} from './http2-pool';
import {JP_CARDS, JP_PRICES, JP_SETS, CARDS, PRICES, SETS, TYPES} from '../files';
import type {Language} from './mappers';
import {scrapeLanguage, scrapeTypes, type ScrapeResult} from './scraper';

const FILES: Record<Language, {cards: string; prices: string; sets: string}> = {
	en: {cards: CARDS, prices: PRICES, sets: SETS},
	ja: {cards: JP_CARDS, prices: JP_PRICES, sets: JP_SETS},
};

export interface ScrapeOptions {
	/** `false` runs the whole pass without touching `src/assets/`, to diff or time it. */
	write?: boolean;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await fs.writeFile(path, JSON.stringify(value));
	console.log(`  wrote ${path}`);
}

export async function scrapeToFiles(langs: readonly Language[] = ['en', 'ja'], {write = true}: ScrapeOptions = {}): Promise<Record<Language, ScrapeResult>> {
	const pool = new Http2Pool();
	const results = {} as Record<Language, ScrapeResult>;
	try {
		for (const lang of langs) {
			results[lang] = await scrapeLanguage(pool, lang);
			if (!write) continue;
			const {cards, prices, sets} = results[lang];
			const files = FILES[lang];
			await Promise.all([writeJson(files.cards, cards), writeJson(files.prices, prices), writeJson(files.sets, sets)]);
		}
		if (write) await writeJson(TYPES, (await scrapeTypes(pool)) ?? []);
	} finally {
		pool.close();
	}
	return results;
}
