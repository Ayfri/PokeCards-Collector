import * as fs from 'node:fs/promises';
import {Http2Pool} from './http2-pool';
import {LANGUAGES} from '#helpers/catalogues.ts';
import {envCardTraderImages, FILES, TYPES} from '../cli-config';
import type {Language} from './mappers';
import {scrapeLanguage, scrapeTypes, type ScrapeResult} from './scraper';

export interface ScrapeOptions {
	/** `false` runs the whole pass without writing to `src/assets/`, to diff or time it. */
	write?: boolean;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await fs.writeFile(path, JSON.stringify(value));
	console.log(`  wrote ${path}`);
}

export async function scrapeToFiles(langs: readonly Language[] = LANGUAGES, {write = true}: ScrapeOptions = {}): Promise<Record<Language, ScrapeResult>> {
	const cardTrader = envCardTraderImages();
	/** Marks the rejection as handled so a CardTrader failure during the first TCGdex pass does not crash Bun; `scrapeLanguage` still throws it when it awaits the map. */
	cardTrader.catch(() => {});
	const pool = new Http2Pool();
	const results = {} as Record<Language, ScrapeResult>;
	try {
		for (const lang of langs) {
			results[lang] = await scrapeLanguage(pool, lang, cardTrader);
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
