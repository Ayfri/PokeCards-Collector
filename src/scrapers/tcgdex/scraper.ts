import {mapAll, type TcgdexClient} from './client';
import {mapCard, mapPrice, mapSet, type Language, type MappedCard, type MappedPrice, type MappedSet} from './mappers';
import type {TcgdexCard, TcgdexSet} from './types';

export interface ScrapeResult {
	cards: MappedCard[];
	prices: Record<string, MappedPrice>;
	sets: MappedSet[];
}

/**
 * One pass per language: list the sets, expand them into card ids, then fetch every card.
 * The per-card REST call carries metadata and pricing together, so a second pricing pass is unnecessary
 * and the GraphQL endpoint - English-only and priceless - buys nothing.
 */
export async function scrapeLanguage(client: TcgdexClient, lang: Language): Promise<ScrapeResult> {
	const started = performance.now();
	const setList = (await client.json<TcgdexSet[]>(`/v2/${lang}/sets`)) ?? [];
	console.log(`[${lang}] ${setList.length} sets`);

	const details = await mapAll(setList, set => client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`));
	const sets = details.filter((set): set is TcgdexSet => set !== null).map(mapSet).sort((a, b) => a.name.localeCompare(b.name));

	const ids = details.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	console.log(`[${lang}] ${ids.length} cards to fetch`);
	const fetched = await mapAll(ids, id => client.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`), `[${lang}] cards`);

	const cards: MappedCard[] = [];
	const prices: Record<string, MappedPrice> = {};
	for (const card of fetched) {
		if (!card) continue;
		const mapped = mapCard(lang, card);
		cards.push(mapped);
		const price = mapPrice(card.pricing);
		if (price) prices[mapped.cardCode] = price;
	}
	cards.sort((a, b) => a.name.localeCompare(b.name));

	const elapsed = (performance.now() - started) / 1000;
	console.log(`[${lang}] ${cards.length} cards, ${Object.keys(prices).length} priced, ${sets.length} sets in ${elapsed.toFixed(2)}s (${(ids.length / elapsed).toFixed(0)} req/s)`);
	return {cards, prices, sets};
}

export const scrapeTypes = (client: TcgdexClient) => client.json<string[]>('/v2/en/types');
