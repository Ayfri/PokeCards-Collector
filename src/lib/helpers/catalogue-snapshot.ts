import type { CardTable, LanguagePaths, PriceTable, SetTable } from '#helpers/catalogues.ts';
import type { Pokemon } from '#lib/types.js';

/**
 * The contract between the publisher (`src/scrapers/publish.ts`) and the site: what an R2 object holds and how it is named.
 * It imports nothing from `cloudflare:workers`, `$app/*` or Node, since the scraper Worker bundles it and the browser can pull its types in.
 */

export const MANIFEST_KEY = 'manifest.json';

export type CatalogueObjectName = CardTable | PriceTable | SetTable | `${CardTable}:details` | `${CardTable}:versions` | 'pokemons' | 'types';

export interface PublishedObject {
	bytes: number;
	key: string;
	rows: number;
}

export interface CatalogueManifest {
	objects: Record<CatalogueObjectName, PublishedObject>;
	publishedAt: string;
}

export interface PublishSummary extends CatalogueManifest {
	/** The manifest this publish replaced, `null` on the first one. */
	previous: CatalogueManifest | null;
	removed: number;
	written: CatalogueObjectName[];
}

/** `cards:details` -> `cards-details/3f2a9c0d1e4b5a6c.json.gz`: one prefix per name, so a key never matches another name's prefix. */
export const objectKey = (name: CatalogueObjectName, hash: string): string => `${name.replace(':', '-')}/${hash}.json.gz`;

/**
 * The columns a card list reads. The list holds every card of a table, and nothing draws `regulation_mark` or `tcgdex_id` of it, so
 * they travel in `CardDetails` and stay out of the payload the browser parses before the grid can paint. `hp`, `stage` and the art
 * columns are read, but `toCard` only keeps them on cards with no scan.
 */
export const CARD_LIST_SELECT = 'card_code,art_image,art_source,artist,card_market_updated_at,card_market_url,hp,image,local_id,name,pokemon_id,rarity,set_id,set_name,stage,subtype,supertype,types';

export interface CardListRow {
	art_image: string | null;
	art_source: string | null;
	artist: string | null;
	card_code: string;
	card_market_updated_at: string | null;
	card_market_url: string | null;
	hp: number | null;
	image: string | null;
	local_id: string | null;
	name: string;
	pokemon_id: number | null;
	rarity: string | null;
	set_id: string | null;
	set_name: string | null;
	stage: string | null;
	subtype: string | null;
	supertype: string | null;
	types: string | null;
}

export const PRICE_SELECT = 'card_code,avg1,avg7,avg30,low,reverse_avg1,reverse_avg7,reverse_avg30,reverse_low,reverse_simple,reverse_trend,simple,trend';

export interface PriceRow {
	avg1: number | null;
	avg7: number | null;
	avg30: number | null;
	card_code: string;
	low: number | null;
	reverse_avg1: number | null;
	reverse_avg7: number | null;
	reverse_avg30: number | null;
	reverse_low: number | null;
	reverse_simple: number | null;
	reverse_trend: number | null;
	simple: number | null;
	trend: number | null;
}

export const SET_SELECT = 'set_id,logo,name,printed_total,ptcgo_code,release_date,series,symbol,total_cards';

export interface SetRow {
	logo: string | null;
	name: string;
	printed_total: number | null;
	ptcgo_code: string | null;
	release_date: string | null;
	series: string | null;
	set_id: string | null;
	symbol: string | null;
	total_cards: number | null;
}

export const POKEMON_SELECT = 'id,name,description,evolves_from,evolves_to';

export interface TypeRow {
	name: string;
}

/**
 * What a card page reads beyond the list row, by `cardCode`, in a separate object so it stays out of every card list payload.
 * `null` hp and `''` for a missing string, like `toCard` reads them. `hp` and `stage` are stored for every card: the published list row carries
 * them too, but the list card `toCard` maps from it drops them on a card with a scan.
 */
export type CardDetails = [hp: number | null, stage: string, regulationMark: string, tcgdexId: string];

/**
 * Own `cardCode` -> the page path of its twin in each other language. Only cards with at least one twin; the own language is never a key.
 * A path is built at publish time, so a change of the slug rule reaches the twins at the next publish (a stale slug answers a 301).
 */
export type CardVersions = Record<string, LanguagePaths>;

export type RawObject<N extends CatalogueObjectName> =
	N extends CardTable ? CardListRow[] : N extends PriceTable ? PriceRow[] : N extends SetTable ? SetRow[]
	: N extends `${string}:details` ? Record<string, CardDetails> : N extends `${string}:versions` ? CardVersions
	: N extends 'pokemons' ? Pokemon[] : TypeRow[];

/**
 * gzip, since `CompressionStream` has no Brotli on Workers (`workers-types` declares gzip, deflate and deflate-raw).
 * `hash` is the first 16 bytes of the SHA-256 of the JSON, in hex (32 chars): it names an R2 object and is the ETag of a payload.
 */
export async function gzipJson(value: unknown): Promise<{ gzip: Uint8Array<ArrayBuffer>; hash: string }> {
	const raw = new TextEncoder().encode(JSON.stringify(value));
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
	const gzip = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
	return { gzip, hash: Array.from(digest.subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('') };
}
