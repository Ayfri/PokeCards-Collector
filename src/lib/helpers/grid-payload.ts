import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import { cardPrice } from '$helpers/card-utils';
import type { FullCard, GridPokemon, Pokemon, PriceData } from '$lib/types';

/** Everything a card grid renders. Kept out of the page load so a `?set=` change cannot force it over the wire again. */
export interface GridPayload {
	artists: string[];
	/** Each card carries its own `price`, the only number the grid reads of the price record. */
	cards: FullCard[];
	pokemons: GridPokemon[];
	rarities: string[];
	types: string[];
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

async function serialize(cards: FullCard[], prices: Record<string, PriceData>, pokemons: Pokemon[], types: string[]): Promise<Serialized> {
	// An artless card is still a real card: deduplicating on `image` hid 8899 of the 12781 Japanese cards.
	/** `cardMarketUpdatedAt` is only drawn on a card page, so the 21k grid tiles leave it out. */
	const visibleCards = cards.filter(card => Boolean(card.setName)).map(({ cardMarketUpdatedAt, ...card }) => ({ ...card, price: cardPrice(prices[card.cardCode]) }));

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

/** The grid payload as a cacheable JSON response: serialized and hashed once per memoized table, `304` when the caller already holds that body. */
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
