import type { FullCard, PriceData, Set } from '$lib/types';
import { buildSetLookupMap, findSetInLookup } from '$helpers/set-utils';

/** One search hit, carrying everything the result row renders so the client needs neither the sets nor the prices. */
export interface CardSearchResult {
	card: FullCard;
	cardNumber: string;
	price: number | null;
	printedTotal: number | null;
	setName: string;
}

/** The `*Lower` fields are what `scoreEntry` matches on; the raw ones are what the result row displays. */
interface SearchEntry {
	card: FullCard;
	cardNumber: string;
	name: string;
	number: string;
	printedTotal: string;
	setCode: string;
	setName: string;
	setNameLower: string;
}

function extractCardNumberFromCode(cardCode: string): string {
	return cardCode?.split('_')[3] || '';
}

/**
 * Resolving the set and lowercasing the fields per keystroke cost ~1 s over the 23k cards, because
 * `findSetByCardCode` rescans every set. The index pays that once and each search is then a plain loop.
 */
let searchIndex: SearchEntry[] = [];
let indexedCards: FullCard[] | null = null;

function buildSearchIndex(cards: FullCard[], sets: Set[]): SearchEntry[] {
	if (indexedCards === cards) return searchIndex;

	const lookup = buildSetLookupMap(sets);
	searchIndex = cards.map(card => {
		const set = findSetInLookup(card.cardCode, lookup);
		const cardNumber = extractCardNumberFromCode(card.cardCode);
		return {
			card,
			cardNumber,
			name: card.name.toLowerCase(),
			number: cardNumber.toLowerCase(),
			printedTotal: set?.printedTotal?.toString() ?? '',
			setCode: set?.ptcgoCode?.toLowerCase() ?? '',
			setName: set?.name ?? '',
			setNameLower: set?.name.toLowerCase() ?? '',
		};
	});
	indexedCards = cards;
	return searchIndex;
}

/** Higher is more relevant; 0 drops the card. Without it "pikachu" surfaced the Detective Pikachu set before any Pikachu. */
function scoreEntry(entry: SearchEntry, query: string): number {
	const { name, number, printedTotal, setCode, setNameLower: setName } = entry;

	// Explicit combined forms win: they name a single printing.
	if (query.includes('/')) {
		const [queryNumber, queryTotal] = query.split('/');
		if (number === queryNumber && (queryTotal ? printedTotal === queryTotal : query.endsWith('/'))) return 130;
	}

	if (query.includes(' ')) {
		const parts = query.split(' ');
		const last = parts[parts.length - 1];
		if (/^\d+$/.test(last) && number === last) {
			const head = parts.slice(0, -1).join(' ');
			if (setCode === head) return 125;
			if (name.includes(head)) return 120;
		}
		// Card name + set name, trying every split point ("pikachu base set").
		for (let i = 1; i < parts.length; i++) {
			if (name.includes(parts.slice(0, i).join(' ')) && setName.includes(parts.slice(i).join(' '))) return 115;
		}
	}

	if (name === query) return 110;
	if (name.startsWith(query)) return 100;
	if (number === query) return 90;
	if (name.includes(query)) return 80;
	if (setCode === query) return 50;
	if (setName.includes(query)) return 40;
	return 0;
}

/** Ranks the catalogue against `query` and returns the best `limit` hits, already enriched with set and price. */
export function searchCards(
	query: string,
	cards: FullCard[],
	sets: Set[],
	prices: Record<string, PriceData>,
	limit = 10
): CardSearchResult[] {
	const normalized = query.toLowerCase().trim();
	if (!normalized) return [];

	const matches: { entry: SearchEntry; score: number }[] = [];
	for (const entry of buildSearchIndex(cards, sets)) {
		const score = scoreEntry(entry, normalized);
		if (score > 0) matches.push({ entry, score });
	}

	return matches
		.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length)
		.slice(0, limit)
		.map(({ entry }) => ({
			card: entry.card,
			cardNumber: entry.cardNumber,
			price: prices[entry.card.cardCode]?.simple ?? null,
			printedTotal: entry.printedTotal ? Number(entry.printedTotal) : null,
			setName: entry.setName,
		}));
}
