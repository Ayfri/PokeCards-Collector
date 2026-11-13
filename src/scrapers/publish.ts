import type { SupabaseClient } from '@supabase/supabase-js';
import {
	CARD_LIST_SELECT,
	type CardDetails,
	type CardListRow,
	type CardVersions,
	type CatalogueManifest,
	type CatalogueObjectName,
	gzipJson,
	MANIFEST_KEY,
	objectKey,
	POKEMON_SELECT,
	PRICE_SELECT,
	type PriceRow,
	type PublishedObject,
	type PublishSummary,
	type RawObject,
	SET_SELECT,
	type SetRow,
	type TypeRow,
} from '#helpers/catalogue-snapshot.ts';
import { cardPath } from '#helpers/card-utils.ts';
import { CATALOGUES, type Language, type LanguagePaths, LANGUAGES } from '#helpers/catalogues.ts';
import type { Pokemon } from '#lib/types.js';
import { readAll } from '#scrapers/supabase-sync.ts';

/**
 * Workers-safe publisher: reads the catalogue tables from Supabase and writes them to R2 as content-addressed gzipped JSON objects, then a
 * `manifest.json` that names them. It only reads catalogue tables, never a user table, and the bucket has no public access: the site reads it through its binding.
 * One table is held at a time, since the isolate has 128 MB.
 */

/** An object stays at least this long after the manifest stopped naming it: a site isolate that still holds the previous manifest can read it. */
const GRACE_MS = 3_600_000;

type CardPublishRow = CardListRow & {regulation_mark: string | null; tcgdex_id: string | null; twin_tcgdex_id?: string | null};

/** The only part of a language's card table that outlives its pass: the twin paths the `:versions` objects are built from. */
interface CardPass {
	/** The page path of the language's cards by the key the other languages look them up by (`tcgdex_id`, or `twin_tcgdex_id` for Japanese). */
	links: Map<string, string>;
	/** Each own card with its own key. */
	own: [cardCode: string, key: string][];
}

/**
 * The twin lookup: English and French cards key on `tcgdex_id`, a Japanese card on `twin_tcgdex_id`, and the twin in each other language is that
 * language's card with the same key, the lowest `card_code` (code-unit order) when several share it. A card with no key or no twin has no entry.
 */
function versionsOf(lang: Language, passes: ReadonlyMap<Language, CardPass>): CardVersions {
	const versions: CardVersions = {};

	for (const [cardCode, key] of passes.get(lang)?.own ?? []) {
		const twins: LanguagePaths = {};
		for (const other of LANGUAGES) {
			const path = other === lang ? undefined : passes.get(other)?.links.get(key);
			if (path) twins[other] = path;
		}
		if (Object.keys(twins).length) versions[cardCode] = twins;
	}

	return versions;
}

const keysOf = (manifest: CatalogueManifest): string[] => Object.values(manifest.objects).map(object => object.key);

class Publisher {
	private readonly bucket: R2Bucket;
	private readonly published = new Map<CatalogueObjectName, PublishedObject>();
	private readonly supabase: SupabaseClient;
	private readonly written: CatalogueObjectName[] = [];

	constructor(supabase: SupabaseClient, bucket: R2Bucket) {
		this.bucket = bucket;
		this.supabase = supabase;
	}

	/** An empty table throws and the previous manifest stays: it means a wiped or unreachable database. The derived `:details` and `:versions` can be empty. */
	private async put<N extends CatalogueObjectName>(name: N, value: RawObject<N>, rows: number): Promise<void> {
		if (!rows && !name.includes(':')) throw new Error(`${name} has no row, the previous snapshot stays`);

		const {gzip, hash} = await gzipJson(value);
		const key = objectKey(name, hash.slice(0, 16));
		const stored = await this.bucket.head(key);
		/**
		 * An object older than half the grace period is put again, which refreshes its `uploaded`: a garbage collection that runs while this publish is
		 * still going cannot take an object the new manifest is about to name. The collector's cutoff is the whole grace period, and the margin between
		 * the two thresholds covers a collector of another run that starts after this check. Only an absent object counts as written.
		 */
		if (!stored || stored.uploaded.getTime() < Date.now() - GRACE_MS / 2) {
			await this.bucket.put(key, gzip, {httpMetadata: {contentType: 'application/gzip'}});
			if (!stored) this.written.push(name);
		}
		this.published.set(name, {bytes: gzip.byteLength, key, rows});
	}

	/**
	 * Publishes the card list and its details in one pass over the table, and returns the links the versions need.
	 * The name order stays although the grid sorts again in the browser: every stable sort and first-match loop downstream breaks its ties on it
	 * (price ties in the grid and the share images, the sitemap page boundaries, `bestCardByPokemon`, the import index, the search ranking).
	 * Each card table has a `(name, card_code)` index for it: without one every page sorts the whole table into a temp file.
	 */
	private async publishCards(lang: Language): Promise<CardPass> {
		const table = CATALOGUES[lang].tables.cards;
		const columns = `${CARD_LIST_SELECT},regulation_mark,tcgdex_id${lang === 'ja' ? ',twin_tcgdex_id' : ''}`;
		const rows = await readAll<CardPublishRow>(this.supabase, table, columns, ['name', 'card_code']);

		const list: CardListRow[] = [];
		const details: Record<string, CardDetails> = {};
		const pass: CardPass = {links: new Map(), own: []};
		const winners = new Map<string, string>();

		for (const {regulation_mark, tcgdex_id, twin_tcgdex_id, ...card} of rows) {
			if (Object.hasOwn(details, card.card_code)) throw new Error(`${table}: ${card.card_code} was read twice, the table moved under the read`);

			list.push(card);
			details[card.card_code] = [card.hp, card.stage || '', regulation_mark || '', tcgdex_id || ''];

			const key = lang === 'ja' ? twin_tcgdex_id : tcgdex_id;
			if (!key) continue;

			pass.own.push([card.card_code, key]);
			/** `tcgdex_id` is unique in English and French, so only Japanese prints can share a twin key: the lowest `card_code` stands for them. */
			const winner = winners.get(key);
			if (winner !== undefined && card.card_code > winner) continue;

			winners.set(key, card.card_code);
			pass.links.set(key, cardPath(lang, {localId: card.local_id || '', name: card.name, setId: card.set_id || '', setName: card.set_name || ''}));
		}

		await this.put(table, list, list.length);
		await this.put(`${table}:details`, details, list.length);
		return pass;
	}

	/**
	 * Deletes the objects neither manifest names, once the previous manifest is itself old enough that no isolate reads it. A publish that
	 * follows another within `GRACE_MS` skips the pass and the next one does it. Returns how many objects went.
	 */
	private async collectGarbage(manifest: CatalogueManifest, previous: CatalogueManifest | null): Promise<number> {
		const cutoff = Date.now() - GRACE_MS;
		if (!previous || Date.parse(previous.publishedAt) > cutoff) return 0;

		const keep = new Set([MANIFEST_KEY, ...keysOf(manifest), ...keysOf(previous)]);
		const stale: string[] = [];
		let cursor: string | undefined;

		do {
			const page = await this.bucket.list({cursor});
			for (const object of page.objects) if (!keep.has(object.key) && object.uploaded.getTime() < cutoff) stale.push(object.key);
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor);

		for (let index = 0; index < stale.length; index += 1000) await this.bucket.delete(stale.slice(index, index + 1000));
		return stale.length;
	}

	async run(): Promise<PublishSummary> {
		const body = await this.bucket.get(MANIFEST_KEY);
		const previous = body ? await body.json<CatalogueManifest>() : null;
		const etag = body?.etag;

		const pokemons = await readAll<Pokemon>(this.supabase, 'pokemons', POKEMON_SELECT, 'id');
		await this.put('pokemons', pokemons, pokemons.length);
		const types = await readAll<TypeRow>(this.supabase, 'types', 'name', 'name');
		await this.put('types', types, types.length);

		const passes = new Map<Language, CardPass>();
		for (const lang of LANGUAGES) {
			const {prices, sets} = CATALOGUES[lang].tables;
			const setRows = await readAll<SetRow>(this.supabase, sets, SET_SELECT, ['name', 'set_id']);
			await this.put(sets, setRows, setRows.length);

			const priceRows = await readAll<PriceRow>(this.supabase, prices, PRICE_SELECT, 'card_code');
			if (new Set(priceRows.map(row => row.card_code)).size !== priceRows.length) throw new Error(`${prices}: a card_code was read twice, the table moved under the read`);
			await this.put(prices, priceRows, priceRows.length);

			passes.set(lang, await this.publishCards(lang));
		}

		for (const lang of LANGUAGES) {
			const versions = versionsOf(lang, passes);
			await this.put(`${CATALOGUES[lang].tables.cards}:versions`, versions, Object.keys(versions).length);
		}

		/** Every name was put above, so the map holds all of them. */
		const manifest: CatalogueManifest = {objects: Object.fromEntries(this.published) as CatalogueManifest['objects'], publishedAt: new Date().toISOString()};
		/**
		 * Two publishes can overlap (the daily workflow and a CLI publish). The manifest is written only if it is still the one this run read, or
		 * still absent: the run that loses fails here, before any garbage collection, instead of putting older data live or naming an object the
		 * other run's collection removed. The winner keeps its manifest.
		 */
		const written = await this.bucket.put(MANIFEST_KEY, JSON.stringify(manifest), {
			httpMetadata: {contentType: 'application/json'},
			onlyIf: etag === undefined ? new Headers({'if-none-match': '*'}) : {etagMatches: etag},
		});
		if (!written) throw new Error('Another publish wrote the manifest first, run it again');

		return {...manifest, previous, removed: await this.collectGarbage(manifest, previous), written: this.written};
	}
}

export const publishCatalogue = (supabase: SupabaseClient, bucket: R2Bucket): Promise<PublishSummary> => new Publisher(supabase, bucket).run();
