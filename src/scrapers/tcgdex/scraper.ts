import * as fs from 'node:fs/promises';
import {CARDTRADER_IMAGES} from '#src/constants.ts';
import {type CardTraderScans, fetchCardTraderScans} from '../cardtrader';
import {FILES, TYPES} from '../cli-config';
import {addFallbackArt} from './art';
import {cardIds, fillImage, imageFallbacks, setCards, setDetails, type TcgdexClient} from './client';
import {listCatalogueSets} from './excluded';
import {Http2Pool} from './http2-pool';
import {type Language, mapCard, type MappedCard, type MappedPrice, type MappedSet, mapPrice, mapSet, sharedProductCodes} from './mappers';
import type {TcgdexSet} from './types';

export interface ScrapeResult {
	cards: MappedCard[];
	prices: Record<string, MappedPrice>;
	sets: MappedSet[];
}

/**
 * One pass per language: list the sets, expand them into card ids, then fetch every card.
 * The per-card REST call returns metadata and pricing together, so no second pricing pass is needed, and the
 * GraphQL endpoint (English-only, no prices) adds nothing.
 */
export async function scrapeLanguage(client: TcgdexClient, lang: Language, cardTrader: Promise<CardTraderScans>): Promise<ScrapeResult> {
	const started = performance.now();
	const {sets: setList, skipped} = await listCatalogueSets(client, lang);
	console.log(`[${lang}] ${setList.length} sets${skipped ? ` (${skipped} skipped, excluded series or repeated id)` : ''}`);

	const details = await setDetails(client, lang, setList.map(set => set.id), true);
	/** TCGdex lists sets it has no card for yet (the 15 Japanese CS sets, all named トリプレットビート), which would show as empty pages. */
	const sets = details.filter((set): set is TcgdexSet => !!set?.cards?.length).map(mapSet).sort((a, b) => a.name.localeCompare(b.name));

	const fallback = await imageFallbacks(client, lang, details);

	console.log(`[${lang}] ${cardIds(details).length} cards to fetch`);
	const fetched = await setCards(client, lang, details, `[${lang}] cards`);

	const {notReady, products} = await cardTrader;
	const cards: MappedCard[] = [];
	const prices: Record<string, MappedPrice> = {};
	for (const card of fetched) {
		if (!card) continue;
		fillImage(lang, card, fallback, products);
		const mapped = mapCard(lang, card);
		cards.push(mapped);
		const price = mapPrice(card.pricing);
		if (price) prices[mapped.cardCode] = price;
	}
	const sharedProducts = sharedProductCodes(cards);
	for (const card of cards) {
		if (!sharedProducts.has(card.cardCode)) continue;
		card.cardMarketUrl = '';
		delete prices[card.cardCode];
		/** CardTrader maps a shared product to the one card Cardmarket sells, so the other card would show a foreign scan. `dropSharedProducts` does the same in the database. */
		if (card.image.startsWith(CARDTRADER_IMAGES)) card.image = '';
	}
	/** After `fillImage` and the shared products, so a card with a CardTrader scan borrows no art and one that lost it does. */
	await addFallbackArt(client, lang, cards, sets);
	cards.sort((a, b) => a.name.localeCompare(b.name));

	const elapsed = (performance.now() - started) / 1000;
	const scans = cards.filter(card => card.image.startsWith(CARDTRADER_IMAGES)).length;
	console.log(`[${lang}] ${cards.length} cards, ${Object.keys(prices).length} priced, ${sets.length} sets, ${scans} CardTrader scans${notReady.length ? ` (CardTrader expansions not ready: ${notReady.join(', ')})` : ''} in ${elapsed.toFixed(2)}s (${(fetched.length / elapsed).toFixed(0)} req/s)`);
	return {cards, prices, sets};
}

/** Throws before returning the promise, so a missing token stops the run before any scraping: without the map, uploading would null every scan CardTrader supplies. */
function envCardTraderScans(): Promise<CardTraderScans> {
	const token = process.env.CARDTRADER_TOKEN;
	if (!token) throw new Error('Missing CARDTRADER_TOKEN');
	return fetchCardTraderScans(token);
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await fs.writeFile(path, JSON.stringify(value));
	console.log(`  wrote ${path}`);
}

/** `write: false` runs the whole pass without writing to `src/assets/`, to diff or time it. */
export async function scrapeToFiles(langs: readonly Language[], write: boolean): Promise<Record<Language, ScrapeResult>> {
	const cardTrader = envCardTraderScans();
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
		if (write) await writeJson(TYPES, (await pool.json<string[]>('/v2/en/types')) ?? []);
	} finally {
		pool.close();
	}
	return results;
}
