import { distinctArtists, distinctRarities } from '#helpers/card-grid.ts';
import { CATALOGUES, type Catalogue } from '#helpers/catalogues.ts';
import { cardPath, cardPrice, formatCardNumber, setPath } from '#helpers/card-utils.ts';
import { cardListSchema, setSchema } from '#helpers/seo.ts';
import type { Set as CardSet, FullCard, GridPokemon, Pokemon, PriceData } from '#lib/types.js';
import { redirect } from '@sveltejs/kit';

/** Everything a card grid renders. Kept out of the page load so a `?set=` change cannot force it over the wire again. */
export interface GridPayload {
	artists: string[];
	/** Each card carries its own `price`, the only number the grid reads of the price record. */
	cards: FullCard[];
	pokemons: GridPokemon[];
	rarities: string[];
	types: string[];
}

/** One row of the plain-text checklist a set grid renders on the server, where the virtual grid draws nothing. */
export interface ChecklistEntry {
	cardCode: string;
	localId: string;
	name: string;
	/** The card page, so the checklist links need no catalogue at render time. */
	path: string;
	price: number | null;
}

/** A priced card of a set, as the set page's "most valuable" line links it. */
export interface TopCard {
	/** The `{#each}` key: two cards can share a slug, never a code. */
	cardCode: string;
	localId: string;
	name: string;
	path: string;
	price: number;
}

/**
 * What a set page adds to its load: a checklist of its cards (a few kB) that the server renders in place of the virtual grid, the schemas, the
 * set's six most valuable cards and its total value, and the most valuable one as a sentence, since answer engines quote a fact before a claim.
 * It lives here rather than in `seo.ts`, which the `Seo` component ships to every browser.
 */
export function setLanding(set: CardSet, cards: FullCard[], prices: Record<string, PriceData>, catalogue: Catalogue = CATALOGUES.en) {
	const setCards = cards.filter(card => card.setId === set.setId).sort((a, b) => a.localId.localeCompare(b.localId, 'en', { numeric: true }));
	const checklist: ChecklistEntry[] = setCards.map(card => ({ cardCode: card.cardCode, localId: card.localId, name: card.name, path: cardPath(catalogue.language, card), price: cardPrice(prices[card.cardCode]) }));
	const topCards: TopCard[] = checklist
		.flatMap(({ cardCode, localId, name, path, price }) => price ? [{ cardCode, localId, name, path, price }] : [])
		.sort((a, b) => b.price - a.price)
		.slice(0, 6);
	const [top] = topCards;

	return {
		checklist,
		schemas: [setSchema(set, catalogue), cardListSchema(setCards, setPath(set, catalogue), `${set.name} card list`, 25, catalogue)],
		topCard: top ? ` The most valuable is ${top.name} ${formatCardNumber(top.localId, set.printedTotal)}, around €${top.price.toFixed(2)} on Cardmarket.` : '',
		topCards,
		value: checklist.reduce((sum, entry) => sum + (entry.price ?? 0), 0),
	};
}

const SET_PAGE_QUERY = new Set(['set', 'sortby', 'sortorder']);

/**
 * Sends an old `?set=` grid URL to the set's own page, with its sort carried over. Only a full document request is redirected: the grid
 * itself changes `?set=` through client navigations (the load reruns as a data request) and has to stay on the grid. A `?set=` that
 * combines other filters is a grid view, not the set page, so it renders as it is.
 */
export function redirectToSetPage(url: URL, isDataRequest: boolean, set: CardSet, catalogue: Catalogue): void {
	if (isDataRequest || [...url.searchParams.keys()].some(key => !SET_PAGE_QUERY.has(key))) return;

	const sort = new URLSearchParams([...url.searchParams].filter(([key]) => key !== 'set'));
	redirect(301, `${setPath(set, catalogue)}${sort.size ? `?${sort}` : ''}`);
}

interface Serialized {
	body: Uint8Array<ArrayBuffer>;
	etag: string;
}

interface Entry {
	pokemons: Pokemon[];
	prices: Record<string, PriceData>;
	serialized: Promise<Serialized>;
	types: string[];
}

/** Keyed on the memoized card list, so a body is rebuilt exactly when `cachedTable` hands out a fresh one. */
const entries = new WeakMap<FullCard[], Entry>();

function gridCards(cards: FullCard[], prices: Record<string, PriceData>) {
	/** An artless card is still a real card, so cards are not deduplicated on `image`: that would hide 8899 of the 12781 Japanese cards. */
	/** `cardMarketUpdatedAt` is only drawn on a card page, so the 21k grid tiles leave it out. */
	return cards.filter(card => Boolean(card.setName)).map(({ cardMarketUpdatedAt, ...card }) => ({ ...card, price: cardPrice(prices[card.cardCode]) }));
}

async function serialize(cards: FullCard[], prices: Record<string, PriceData>, pokemons: Pokemon[], types: string[]): Promise<Serialized> {
	const visibleCards = gridCards(cards, prices);

	const body = new TextEncoder().encode(JSON.stringify({
		artists: distinctArtists(visibleCards),
		cards: visibleCards,
		pokemons: pokemons.map(({ id, name }) => ({ id, name })),
		rarities: distinctRarities(visibleCards),
		types,
	} satisfies GridPayload));

	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
	return { body, etag: `"${Array.from(digest.subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('')}"` };
}

/**
 * The grid payload of one set, for its page: its cards, with the pokemons and types they use and nothing of the rest of the catalogue.
 * Small enough to build per request, so there is no ETag; only the browser holds it, for ten minutes. `404` when the set has no card.
 */
export function setGridResponse(cards: FullCard[], prices: Record<string, PriceData>, pokemons: Pokemon[], types: string[], setId: string): Response {
	const setCards = gridCards(cards.filter(card => card.setId === setId), prices);
	if (!setCards.length) return Response.json({ error: 'Unknown set' }, { status: 404 });

	const dexNumbers = new Set(setCards.map(card => card.pokemonNumber));
	const cardTypes = setCards.map(card => card.types.toLowerCase());

	return Response.json({
		artists: distinctArtists(setCards),
		cards: setCards,
		pokemons: pokemons.filter(({ id }) => dexNumbers.has(id)).map(({ id, name }) => ({ id, name })),
		rarities: distinctRarities(setCards),
		types: types.filter(type => cardTypes.some(owned => owned.includes(type.toLowerCase()))),
	} satisfies GridPayload, { headers: { 'cache-control': 'public, max-age=600' } });
}

/** The grid payload as a cacheable JSON response. It is serialized and hashed once per memoized table, and a caller that already has that body gets a `304`. */
export async function gridResponse(request: Request, cards: FullCard[], prices: Record<string, PriceData>, pokemons: Pokemon[], types: string[]): Promise<Response> {
	let entry = entries.get(cards);
	if (!entry || entry.prices !== prices || entry.pokemons !== pokemons || entry.types !== types) {
		entry = { pokemons, prices, serialized: serialize(cards, prices, pokemons, types), types };
		entries.set(cards, entry);
	}

	const { body, etag } = await entry.serialized;
	const headers = { 'cache-control': 'public, max-age=600', etag };

	if (request.headers.get('if-none-match')?.split(',').some(tag => tag.trim().replace(/^W\//, '') === etag)) {
		return new Response(null, { headers, status: 304 });
	}

	return new Response(body, { headers: { ...headers, 'content-type': 'application/json' } });
}
