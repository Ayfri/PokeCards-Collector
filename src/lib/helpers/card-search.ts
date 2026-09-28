import type { FullCard, Pokemon, PriceData, Set } from '$lib/types';
import { cardPrice } from '$helpers/card-utils';

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

/** Resolving the set and lowercasing the fields once per catalogue, so each search is a plain loop over the index. */
let searchIndex: SearchEntry[] = [];

/** TCGdex zero-pads numbers ("043"), people type "43". */
const numberKey = (value: string) => value.replace(/^0+(?=\d)/, '');
let indexedCards: FullCard[] | null = null;

function buildSearchIndex(cards: FullCard[], sets: Set[]): SearchEntry[] {
	if (indexedCards === cards) return searchIndex;

	const setsById = new Map(sets.map(set => [set.setId, set]));
	searchIndex = cards.map(card => {
		const set = setsById.get(card.setId);
		const cardNumber = card.localId;
		return {
			card,
			cardNumber,
			name: card.name.toLowerCase(),
			number: numberKey(cardNumber.toLowerCase()),
			printedTotal: set?.printedTotal?.toString() ?? '',
			setCode: set?.ptcgoCode?.toLowerCase() ?? '',
			setName: set?.name ?? '',
			setNameLower: set?.name.toLowerCase() ?? '',
		};
	});
	indexedCards = cards;
	return searchIndex;
}

/** The per-query work `scoreEntry` used to redo for each of the 23546 entries: splitting on `/` and on spaces. */
interface CompiledQuery {
	/** Every `name` / `setName` split point of a multi-word query ("pikachu base set" -> [["pikachu", "base set"], ...]). */
	nameSetSplits: [string, string][] | null;
	numberText: string;
	numberTotal: string | null;
	slashNumber: string | null;
	slashOpen: boolean;
	tailHead: string;
	tailNumber: string | null;
	text: string;
}

function compileQuery(text: string): CompiledQuery {
	const query: CompiledQuery = {
		nameSetSplits: null,
		numberText: numberKey(text),
		numberTotal: null,
		slashNumber: null,
		slashOpen: text.endsWith('/'),
		tailHead: '',
		tailNumber: null,
		text,
	};

	if (text.includes('/')) {
		const [number, total] = text.split('/');
		query.slashNumber = numberKey(number);
		query.numberTotal = total || null;
	}

	if (text.includes(' ')) {
		const parts = text.split(' ');
		const last = parts[parts.length - 1];
		if (/^\d+$/.test(last)) {
			query.tailNumber = numberKey(last);
			query.tailHead = parts.slice(0, -1).join(' ');
		}
		query.nameSetSplits = [];
		for (let i = 1; i < parts.length; i++) {
			query.nameSetSplits.push([parts.slice(0, i).join(' '), parts.slice(i).join(' ')]);
		}
	}

	return query;
}

/** Higher is more relevant; 0 drops the card. Without it "pikachu" surfaced the Detective Pikachu set before any Pikachu. */
function scoreEntry(entry: SearchEntry, query: CompiledQuery): number {
	const { name, number, printedTotal, setCode, setNameLower: setName } = entry;
	const text = query.text;

	// Explicit combined forms win: they name a single printing.
	if (query.slashNumber !== null && number === query.slashNumber
		&& (query.numberTotal ? printedTotal === query.numberTotal : query.slashOpen)) return 130;

	if (query.tailNumber !== null && number === query.tailNumber) {
		if (setCode === query.tailHead) return 125;
		if (name.includes(query.tailHead)) return 120;
	}

	// Card name + set name, trying every split point ("pikachu base set").
	if (query.nameSetSplits) {
		for (const [cardPart, setPart] of query.nameSetSplits) {
			if (name.includes(cardPart) && setName.includes(setPart)) return 115;
		}
	}

	if (name === text) return 110;
	if (name.startsWith(text)) return 100;
	if (number === query.numberText) return 90;
	if (name.includes(text)) return 80;
	if (setCode === text) return 50;
	if (setName.includes(text)) return 40;
	return 0;
}

/**
 * Ranks the catalogue against `query` and returns the best `limit` hits, already enriched with set and price.
 * The hits are kept in a sorted array of `limit` entries rather than collected and sorted at the end: a one-letter
 * query matches nearly every card, and sorting those 20k matches to keep ten of them was the bulk of the work.
 */
export function searchCards(
	query: string,
	cards: FullCard[],
	sets: Set[],
	prices: Record<string, PriceData>,
	limit = 10
): CardSearchResult[] {
	const normalized = query.toLowerCase().trim();
	if (!normalized) return [];

	const compiled = compileQuery(normalized);
	const best: { entry: SearchEntry; score: number }[] = [];
	let lowestScore = 0;

	for (const entry of buildSearchIndex(cards, sets)) {
		const score = scoreEntry(entry, compiled);
		if (score === 0) continue;

		// Ties break on the shorter name, so an equal score still has to beat the tail on length.
		if (best.length === limit && (score < lowestScore
			|| (score === lowestScore && entry.name.length >= best[limit - 1].entry.name.length))) continue;

		let index = best.length - 1;
		while (index >= 0 && (best[index].score < score
			|| (best[index].score === score && best[index].entry.name.length > entry.name.length))) index--;
		best.splice(index + 1, 0, { entry, score });
		if (best.length > limit) best.pop();
		lowestScore = best[best.length - 1].score;
	}

	return best.map(({ entry }) => ({
		card: entry.card,
		cardNumber: entry.cardNumber,
		price: cardPrice(prices[entry.card.cardCode]),
		printedTotal: entry.printedTotal ? Number(entry.printedTotal) : null,
		setName: entry.setName,
	}));
}

/** A species hit, linking to the card list narrowed to its Pokédex number. */
export interface PokemonSearchResult {
	cardCount: number;
	id: number;
	name: string;
}

/** PokeAPI slugs ("mr-mime", "farfetchd", "flabebe") against what people type ("Mr. Mime", "Farfetch'd", "Flabébé"). */
const pokemonKey = (value: string) => value.normalize('NFD').replace(/[̀-ͯ'’]/g, '').replace(/[-.\s]+/g, ' ').trim();

let indexedPokemons: { cardCount: number; key: string; pokemon: Pokemon }[] = [];
let indexedPokemonSources: [Pokemon[], FullCard[]] | null = null;

/** Species with at least one card, keyed for matching; rebuilt only when either cached table changes. */
function buildPokemonIndex(pokemons: Pokemon[], cards: FullCard[]) {
	if (indexedPokemonSources?.[0] === pokemons && indexedPokemonSources[1] === cards) return indexedPokemons;

	const counts = new Map<number, number>();
	for (const card of cards) {
		if (card.pokemonNumber) counts.set(card.pokemonNumber, (counts.get(card.pokemonNumber) ?? 0) + 1);
	}
	indexedPokemons = pokemons
		.filter(pokemon => counts.has(pokemon.id))
		.map(pokemon => ({ cardCount: counts.get(pokemon.id)!, key: pokemonKey(pokemon.name), pokemon }));
	indexedPokemonSources = [pokemons, cards];
	return indexedPokemons;
}

/** Species whose name matches `query` (exact, then prefix, then substring) or whose Pokédex number it is. */
export function searchPokemons(query: string, pokemons: Pokemon[], cards: FullCard[], limit = 3): PokemonSearchResult[] {
	const key = pokemonKey(query.toLowerCase());
	if (!key) return [];

	const dexNumber = /^#?\d+$/.test(key) ? Number(key.replace('#', '')) : null;
	const score = (entry: { key: string; pokemon: Pokemon }) =>
		entry.pokemon.id === dexNumber || entry.key === key ? 3 : entry.key.startsWith(key) ? 2 : entry.key.includes(key) ? 1 : 0;

	return buildPokemonIndex(pokemons, cards)
		.map(entry => ({ entry, score: score(entry) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.entry.key.length - b.entry.key.length)
		.slice(0, limit)
		.map(({ entry }) => ({ cardCount: entry.cardCount, id: entry.pokemon.id, name: entry.pokemon.name }));
}
