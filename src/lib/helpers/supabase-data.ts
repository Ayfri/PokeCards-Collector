import type { FullCard, Pokemon, PriceData, Set } from '#lib/types.js';
import { supabase } from '#lib/supabase.ts';
import { cachedTable, keepAlive, PartialRows, STATIC_TTL, TABLE_TTL } from '#helpers/data-cache.ts';
import { type CardTable, CATALOGUES, type Language, type LanguagePaths, LANGUAGES, type PriceTable, type SetTable } from '#helpers/catalogues.ts';
import { type CardLink, cardPath, cardSlug, cardSlugParts, memoizedOn, setPath, setsById, setSlug } from '#helpers/card-utils.ts';
import { mirrorPath } from '#helpers/set-images.ts';
import setTwinsJson from '#scrapers/tcgdex/jp-set-twins.json' with { type: 'json' };
import type { SupabaseClient } from '@supabase/supabase-js';

const SET_TWINS: Record<'en' | 'ja', Partial<Record<string, string>>> = setTwinsJson;

/** Every card column, for the reads that need the details. Keep it in sync with the `cards` / `jp_cards` / `fr_cards` schema. */
const CARD_COLUMNS = `
	card_code,
	art_image,
	art_source,
	artist,
	card_market_updated_at,
	card_market_url,
	hp,
	image,
	legal_standard,
	local_id,
	name,
	pokemon_id,
	rarity,
	regulation_mark,
	set_id,
	set_name,
	stage,
	subtype,
	supertype,
	tcgdex_id,
	types,
	variants
`;

/**
 * The columns a card list reads. `getCards` returns every card in the table, and nothing renders four of the columns
 * (`legal_standard`, `regulation_mark`, `tcgdex_id`, `variants`), so they would only slow down the
 * payload the browser parses before the grid can paint. `hp`, `stage` and the art columns are read, but `toCard` only keeps them on cards with no scan.
 */
const CARD_LIST_COLUMNS = `
	card_code,
	art_image,
	art_source,
	artist,
	card_market_updated_at,
	card_market_url,
	hp,
	image,
	local_id,
	name,
	pokemon_id,
	rarity,
	set_id,
	set_name,
	stage,
	subtype,
	supertype,
	types
`;

interface CardRow {
	art_image: string | null;
	art_source: string | null;
	artist: string | null;
	card_code: string;
	card_market_updated_at?: string | null;
	card_market_url: string | null;
	hp?: number | null;
	image: string | null;
	legal_standard?: boolean | null;
	local_id?: string | null;
	name: string;
	pokemon_id: number | null;
	rarity: string | null;
	regulation_mark?: string | null;
	set_id: string | null;
	set_name: string | null;
	stage?: string | null;
	subtype?: string | null;
	supertype: string | null;
	tcgdex_id?: string | null;
	types: string | null;
	variants?: FullCard['variants'];
}

interface PriceRow {
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

interface SetRow {
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

function toCard(card: CardRow): FullCard {
	const listCard: FullCard = {
		artist: card.artist || '',
		cardCode: card.card_code,
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		image: card.image || '',
		localId: card.local_id || '',
		name: card.name,
		rarity: card.rarity || '',
		setId: card.set_id || '',
		setName: card.set_name || '',
		/** Trainers and Energy have no Pokédex id, so they carry no `void 0` key. */
		...(card.pokemon_id != null && { pokemonNumber: card.pokemon_id }),
		/** Only a card drawn as a plate shows its HP, so the tiles with a scan skip it: 1251 numbers in the English grid payload instead of 17941. */
		...(!card.image && card.hp != null && { hp: card.hp }),
		/** The plate names the stage (`Basic`, `Stage1`) in its name bar like a real card, so only the cards drawn as plates carry it. */
		...(!card.image && card.stage && { stage: card.stage }),
		/** A card with a scan never draws its plate, so a stale borrowed artwork (the scan arrived after the CLI stored it) stays off the object. */
		...(!card.image && card.art_image && { artImage: card.art_image, ...(card.art_source && { artSource: card.art_source }) }),
		/** Only Trainer and Energy cards have one, so the 17k Pokémon carry no empty key. */
		...(card.subtype && { subtype: card.subtype }),
		supertype: card.supertype || '',
		types: card.types || '',
	};

	/** A list read selects `CARD_LIST_COLUMNS`, so the detail-only keys stay off the object instead of adding 23546 empty values. */
	if (!('variants' in card)) return listCard;

	return {
		...listCard,
		/** A null HP stays off the object like the other optional keys: devalue writes an undefined one as `void 0`. */
		...(card.hp != null && { hp: card.hp }),
		legalStandard: card.legal_standard ?? false,
		regulationMark: card.regulation_mark || '',
		stage: card.stage || '',
		tcgdexId: card.tcgdex_id || '',
		variants: card.variants ?? null,
	};
}

const PRICE_COLUMNS: [column: Exclude<keyof PriceRow, 'card_code'>, key: keyof PriceData][] = [
	['simple', 'simple'],
	['low', 'low'],
	['trend', 'trend'],
	['avg1', 'avg1'],
	['avg7', 'avg7'],
	['avg30', 'avg30'],
	['reverse_simple', 'reverseSimple'],
	['reverse_low', 'reverseLow'],
	['reverse_trend', 'reverseTrend'],
	['reverse_avg1', 'reverseAvg1'],
	['reverse_avg7', 'reverseAvg7'],
	['reverse_avg30', 'reverseAvg30'],
];

/** A null column leaves its key off the record: devalue writes an undefined one as `void 0` into every document that carries prices. */
function toPrice(price: PriceRow): PriceData {
	const data: PriceData = {};
	for (const [column, key] of PRICE_COLUMNS) {
		if (price[column] !== null) data[key] = price[column];
	}
	return data;
}

let staticFiles: Promise<ReadonlySet<string>> | undefined;

/**
 * The static files of the build, `/`-prefixed. `$app/manifest` is imported on demand because a static import keeps its whole data module
 * (every route and asset) in any client bundle that pulls this module in, through `user-cards-page.ts`. A failed import is forgotten so the next
 * call retries, and meanwhile the sets keep their remote URLs, as an unmirrored set does.
 */
const buildStaticFiles = () => staticFiles ??= import('$app/manifest').then(({ assets }) => new Set(assets.map(asset => `/${asset.path}`)), () => {
	staticFiles = undefined;
	return new Set<string>();
});

/** A set logo or symbol is served from its mirror when the build holds the file, so a set added after the mirror keeps its remote URL. */
function localImage(url: string | null, files: ReadonlySet<string>): string {
	const path = url ? mirrorPath(url) : undefined;
	return path && files.has(path) ? path : url || '';
}

function toSet(set: SetRow, files: ReadonlySet<string>): Set {
	return {
		logo: localImage(set.logo, files),
		name: set.name,
		printedTotal: set.printed_total || 0,
		ptcgoCode: set.ptcgo_code || '',
		releaseDate: set.release_date ? new Date(set.release_date) : new Date('1995-01-01'),
		series: set.series || '',
		setId: set.set_id || '',
		symbol: localImage(set.symbol, files),
		totalCards: set.total_cards || 0,
	};
}

interface QueryResult {
	error: { code?: string; message: string } | null;
	status?: number;
}

const READ_ATTEMPTS = 3;

/**
 * Runs a Supabase read until it succeeds, up to `READ_ATTEMPTS` times with a linear backoff.
 *
 * Paging a card table fires ~5 subrequests at once, and one of them occasionally dies with
 * `Error: Network connection lost.`, a Workers-side transient that works on the next try.
 * Without the retry, that single dropped batch would reach the page as a 500.
 */
async function readWithRetry<T extends QueryResult>(label: string, run: () => PromiseLike<T>): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			const result = await run();
			if (!result.error) return result;
			/** A `head: true` count that fails comes back with an empty message, so the status and code say what happened. */
			const reason = result.error.message || `status ${result.status ?? '?'}, code ${result.error.code || 'none'}`;
			if (attempt === READ_ATTEMPTS) throw new Error(`Failed to ${label}: ${reason}`);
			console.warn(`Retrying ${label} after error (attempt ${attempt}):`, reason);
		} catch (cause) {
			if (attempt === READ_ATTEMPTS) throw cause;
			console.warn(`Retrying ${label} after throw (attempt ${attempt}):`, cause);
		}

		await new Promise(resolve => setTimeout(resolve, 100 * attempt));
	}
}

/**
 * Fetches a whole table. The card tables exceed Supabase's per-select row cap, so the rows are counted
 * first and every 5000-row page is then requested in parallel.
 *
 * `keyColumn` must hold a unique value: the pages are separate queries, and Postgres only returns them in a
 * repeatable order when the sort is total. Paging `cards` on `name` alone drops ~1700 rows and duplicates
 * others, because only 4618 of its 23546 rows have a name no other row shares.
 *
 * A paged row count that differs from the exact count means the table moved between the queries (the daily sync
 * rewrites it), so the whole read is retried. Past the last attempt the short result is thrown as `PartialRows`:
 * `cachedTable` serves it once without storing it, instead of pinning it for the TTL.
 */
async function getAllData<T>(
	tableName: CardTable | PriceTable | SetTable | 'pokemons' | 'types',
	keyColumn: string,
	selectQuery: string = '*',
	orderBy?: { ascending: boolean; column: string; }
): Promise<T[]> {
	for (let attempt = 1; ; attempt++) {
		const { count, rows } = await pageTable<T>(tableName, keyColumn, selectQuery, orderBy);
		if (rows.length === count) return rows;

		console.warn(`${tableName}: paged ${rows.length} rows for a count of ${count} (attempt ${attempt})`);
		if (attempt === READ_ATTEMPTS) throw new PartialRows(rows);

		await new Promise(resolve => setTimeout(resolve, 500 * attempt));
	}
}

async function pageTable<T>(
	tableName: CardTable | PriceTable | SetTable | 'pokemons' | 'types',
	keyColumn: string,
	selectQuery: string,
	orderBy?: { ascending: boolean; column: string; }
): Promise<{ count: number; rows: T[] }> {
	const batchSize = 5000;
	const allData: T[] = [];

	const { count } = await readWithRetry(`count ${tableName}`, () => supabase
		.from(tableName)
		.select('*', { count: 'exact', head: true }));

	const totalCount = count || 0;
	const numberOfBatches = Math.ceil(totalCount / batchSize);

	const batchPromises = Array.from({ length: numberOfBatches }, (_, index) => {
		const from = index * batchSize;

		return readWithRetry(`fetch ${tableName} rows ${from}-${from + batchSize - 1}`, () => {
			let query = supabase.from(tableName).select(selectQuery);

			if (orderBy) {
				query = query.order(orderBy.column, { ascending: orderBy.ascending });
			}

			return query.order(keyColumn, { ascending: true }).range(from, from + batchSize - 1);
		});
	});

	const results = await Promise.all(batchPromises);

	for (const { data } of results) {
		if (data && data.length > 0) {
			allData.push(...(data as T[]));
		}
	}

	return { count: totalCount, rows: allData };
}

export async function getPokemons(): Promise<Pokemon[]> {
	return cachedTable('pokemons', STATIC_TTL, () => getAllData<Pokemon>('pokemons', 'id', '*', { ascending: true, column: 'id' }), rows => rows);
}

/**
 * The name order stays although the grid sorts again in the browser: every stable sort and first-match loop downstream breaks its ties on it
 * (price ties in the grid and the share images, the sitemap page boundaries, `getTwinPaths`, `bestCardByPokemon`, the import index, the search ranking).
 */
function cardListRows(table: CardTable): Promise<CardRow[]> {
	return getAllData<CardRow>(table, 'card_code', CARD_LIST_COLUMNS, { ascending: true, column: 'name' });
}

/** How long the versions read below is trusted: a day-old table is re-read within this delay of the sync that bumped its version. */
const VERSION_CHECK_MS = 5 * 60_000;
const VERSION_READ_TIMEOUT_MS = 3000;

let versions: { byLanguage: Map<Language, string>; expires: number } | null = null;
let versionsInFlight: Promise<Map<Language, string>> | null = null;

async function readVersions(): Promise<Map<Language, string>> {
	let byLanguage = versions?.byLanguage ?? new Map<Language, string>();

	/**
	 * No retry: a failed read keeps the last known versions (none: the plain TTL applies) and the next check comes in `VERSION_CHECK_MS`.
	 * The deadline keeps a hung select from holding `versionsInFlight`, and with it every table read.
	 */
	try {
		const { data, error } = await supabase.from('catalogue_versions').select('language, version').abortSignal(AbortSignal.timeout(VERSION_READ_TIMEOUT_MS));
		if (error) throw new Error(error.message);
		byLanguage = new Map(data.filter((row): row is { language: Language; version: string } => LANGUAGES.includes(row.language)).map(row => [row.language, row.version]));
	} catch (cause) {
		console.warn('Failed to read catalogue_versions, keeping the previous versions:', cause);
	}

	versions = { byLanguage, expires: Date.now() + VERSION_CHECK_MS };
	return byLanguage;
}

/** The version the daily sync gave a language's tables, or null when there is none. One select per isolate every `VERSION_CHECK_MS`. */
async function catalogueVersion(language: Language): Promise<string | null> {
	if (versions && versions.expires > Date.now()) return versions.byLanguage.get(language) ?? null;

	if (!versionsInFlight) {
		versionsInFlight = readVersions().finally(() => versionsInFlight = null);
		keepAlive(versionsInFlight);
	}
	return (await versionsInFlight).get(language) ?? null;
}

export async function getCards(language: Language = 'en'): Promise<FullCard[]> {
	const { cards } = CATALOGUES[language].tables;
	return cachedTable(cards, TABLE_TTL, () => cardListRows(cards), rows => rows.map(toCard), await catalogueVersion(language), true);
}

/** English and French cards share their `tcgdex_id`; a separate read keeps the column out of every card payload. */
async function getTcgdexIds(language: 'en' | 'fr'): Promise<Map<string, string>> {
	const { cards } = CATALOGUES[language].tables;
	return cachedTable(`${cards}:tcgdex`, TABLE_TTL, () => getAllData<{ card_code: string; tcgdex_id: string | null }>(cards, 'card_code', 'card_code, tcgdex_id'), rows => {
		const ids = new Map<string, string>();
		for (const row of rows) if (row.tcgdex_id) ids.set(row.card_code, row.tcgdex_id);
		return ids;
	}, await catalogueVersion(language), true);
}

type TwinPaths = Record<'en' | 'fr', string>;

const twinPathsMemo = new WeakMap<object, unknown>();

/**
 * The page paths of an English card and its French twin, by `cardCode` of `language`, for the cards that have one. Memoized on the identity of the
 * four reads behind it (both card lists, both id maps), since each one expires on its own clock, and the memo keeps none of them alive.
 */
export async function getTwinPaths(language: 'en' | 'fr'): Promise<Map<string, TwinPaths>> {
	const other = language === 'en' ? 'fr' : 'en';
	const [cards, otherCards, ids, otherIds] = await Promise.all([getCards(language), getCards(other), getTcgdexIds(language), getTcgdexIds(other)]);

	return memoizedOn(twinPathsMemo, [cards, otherCards, ids, otherIds], () => {
		const otherById = new Map<string, FullCard>();
		for (const card of otherCards) {
			const id = otherIds.get(card.cardCode);
			if (id && !otherById.has(id)) otherById.set(id, card);
		}

		const twins = new Map<string, TwinPaths>();
		for (const card of cards) {
			const id = ids.get(card.cardCode);
			const twin = id && otherById.get(id);
			if (!twin) continue;

			twins.set(card.cardCode, language === 'en'
				? { en: cardPath('en', card), fr: cardPath('fr', twin) }
				: { en: cardPath('en', twin), fr: cardPath('fr', card) });
		}

		return twins;
	});
}

/** The columns a card's URL is built from, for the reads that find a card without loading the whole list. */
const LINK_COLUMNS = 'card_code, name, set_name, set_id, local_id';

interface LinkRow {
	card_code: string;
	local_id?: string | null;
	name: string;
	set_id?: string | null;
	set_name?: string | null;
}

/** What `card_versions` returns: the card itself, and for each other language its first print, null when it has none. The card's own language key is null. */
type VersionRows = { own: LinkRow } & Partial<Record<Language, LinkRow | null>>;

function linkOf(row: LinkRow): CardLink & { cardCode: string } {
	return { cardCode: row.card_code, localId: row.local_id || '', name: row.name, setId: row.set_id || '', setName: row.set_name || '' };
}

/** Picks a card without reading the table: one count, then the single row at that offset. It carries the fields its URL is built from. */
export async function getRandomCard(): Promise<(CardLink & { cardCode: string }) | null> {
	const { count } = await readWithRetry('count cards', () => supabase.from('cards').select('*', { count: 'exact', head: true }));

	if (!count) return null;

	const offset = Math.floor(Math.random() * count);
	const { data } = await readWithRetry('fetch random card', () => supabase
		.from('cards')
		.select(LINK_COLUMNS)
		.order('card_code', { ascending: true })
		.range(offset, offset));

	const row = data?.[0];
	return row ? linkOf(row) : null;
}

interface SlugIndex {
	bySlug: Map<string, FullCard>;
	/** `set-number` of the slug, only for a card that has both parts, so a URL with a wrong or stale name part still finds its card. */
	byTail: Map<string, FullCard>;
}

/** Keyed on the memoized card list, so the index is rebuilt exactly when `cachedTable` hands out a fresh one. */
const slugIndexes = new WeakMap<FullCard[], SlugIndex>();

/**
 * A slug depends only on the card's own fields, so two different cards can share one only when their name, set and number are alike.
 * The card with the lowest `cardCode` keeps the slug, which makes the pick the same on every isolate.
 */
function keepLowest(index: Map<string, FullCard>, key: string, card: FullCard): boolean {
	const kept = index.get(key);
	if (!kept || card.cardCode < kept.cardCode) index.set(key, card);

	return kept !== undefined && kept.cardCode !== card.cardCode;
}

function slugIndex(language: Language, cards: FullCard[]): SlugIndex {
	const known = slugIndexes.get(cards);
	if (known) return known;

	const index: SlugIndex = { bySlug: new Map(), byTail: new Map() };
	let collisions = 0;

	for (const card of cards) {
		const slug = cardSlug(card, language);
		if (keepLowest(index.bySlug, slug, card)) collisions++;

		const [, set, number] = cardSlugParts(card, language);
		if (set && number) keepLowest(index.byTail, `${set}-${number}`, card);
	}

	if (collisions) console.warn(`${CATALOGUES[language].tables.cards}: ${collisions} card slugs shared by several cards`);

	slugIndexes.set(cards, index);
	return index;
}

/** A card name has a handful of words, so a slug is never searched past this many leading tokens: a crafted URL stays cheap. */
const MAX_SLUG_NAME_TOKENS = 32;

/**
 * The card a URL slug names. The request slug is compared in NFC and lowercase, since a Japanese slug reaches the server percent-encoded in either
 * normalization form. A slug that misses (the name was renamed, or typed wrong) retries with its leading words dropped until `set-number` hits.
 * Only a tail that is a real `set-number` matches, never a lone number or set, so a junk URL does not redirect to a card.
 * `canonical` is the card's own slug: the caller redirects to it when it differs from the one requested.
 */
export async function findCardBySlug(language: Language, slug: string): Promise<{ canonical: string; card: FullCard; } | null> {
	const { bySlug, byTail } = slugIndex(language, await getCards(language));
	const wanted = slug.normalize('NFC').toLowerCase();
	const parts = wanted.split('-');

	let card = bySlug.get(wanted);
	for (let start = 1; !card && start <= MAX_SLUG_NAME_TOKENS && start < parts.length - 1; start++) card = byTail.get(parts.slice(start).join('-'));

	return card ? { canonical: cardSlug(card, language), card } : null;
}

/** A card's URL fields by code, in one row read: the legacy `/card/<cardCode>` redirect needs no catalogue. */
export async function findCardLinkByCode(language: Language, cardCode: string): Promise<(CardLink & { cardCode: string }) | null> {
	const { cards } = CATALOGUES[language].tables;
	const { data } = await readWithRetry(`fetch ${cards} ${cardCode} link`, () => supabase.from(cards).select(LINK_COLUMNS).eq('card_code', cardCode).maybeSingle<LinkRow>());
	return data ? linkOf(data) : null;
}

/** One card with every column, for its own page: the list reads leave out `variants` and the like, and keep `hp` and `stage` only on cards with no scan. */
export async function getCardDetails(language: Language, cardCode: string): Promise<FullCard | null> {
	const { cards } = CATALOGUES[language].tables;
	const { data } = await readWithRetry(`fetch ${cards} ${cardCode}`, () => supabase.from(cards).select(CARD_COLUMNS).eq('card_code', cardCode).maybeSingle<CardRow>());
	return data ? toCard(data) : null;
}

/** One price row, for the reads that need a single card's price without loading the price table. */
export async function getCardPrice(language: Language, cardCode: string): Promise<PriceData | null> {
	const { prices } = CATALOGUES[language].tables;
	const { data } = await readWithRetry(`fetch ${prices} ${cardCode}`, () => supabase.from(prices).select('*').eq('card_code', cardCode).maybeSingle<PriceRow>());
	return data ? toPrice(data) : null;
}

/**
 * The same card in the other catalogues. English and French cards share their TCGdex id, and a Japanese card stores the English id of
 * its twin in `twin_tcgdex_id`, so the English id is the key: a Japanese card reads it from its own row, the other two use their `tcgdex_id`.
 * Several Japanese prints can share one English twin, and the first `card_code` stands for them so the link never changes between visits.
 * A card with no id, or a Japanese card with no twin, only has itself. It is one database call (the `card_versions` SQL function) for the three languages.
 */
export async function getCardVersions(language: Language, cardCode: string): Promise<LanguagePaths> {
	const { data: result } = await readWithRetry(`call card_versions ${language} ${cardCode}`, () => supabase.rpc('card_versions', { p_card_code: cardCode, p_language: language }));
	/** The untyped client reads every rpc result as a row array, and `overrideTypes` refuses to cast an array to the object this scalar function returns. */
	const data = result as VersionRows | null;
	if (!data) return {};

	const versions: LanguagePaths = { [language]: cardPath(language, linkOf(data.own)) };
	for (const target of LANGUAGES) {
		const twin = data[target];
		if (twin) versions[target] = cardPath(target, linkOf(twin));
	}

	return versions;
}

/**
 * The same set in the other catalogues. English and French share TCGdex set ids, and a Japanese set is paired with an English one through
 * `jp-set-twins.json` (`bun run scrapers link`), French following the English id. A language with no such set is left out.
 */
export async function getSetVersions(language: Language, set: Set): Promise<LanguagePaths> {
	const english = language === 'ja' ? SET_TWINS.ja[set.setId] : set.setId;
	const ids: Record<Language, string | undefined> = { en: english, fr: english, ja: language === 'ja' ? set.setId : english && SET_TWINS.en[english] };
	const versions: LanguagePaths = {};

	await Promise.all(LANGUAGES.map(async target => {
		const id = ids[target];
		const other = id ? setsById(await getSets(target)).get(id) : undefined;
		if (other) versions[target] = setPath(other, CATALOGUES[target]);
	}));

	return versions;
}

/** `select(count)` with `head: true`: the homepage only prints this number, it has no use for the 12781 rows behind it. */
export async function countCards(language: Language): Promise<number> {
	const { cards } = CATALOGUES[language].tables;
	return cachedTable(`${cards}:count`, TABLE_TTL, async () => {
		const { count } = await readWithRetry(`count ${cards}`, () => supabase.from(cards).select('*', { count: 'exact', head: true }));
		return count ?? 0;
	}, count => count, await catalogueVersion(language));
}

export async function getPrices(language: Language = 'en'): Promise<Record<string, PriceData>> {
	const { prices } = CATALOGUES[language].tables;
	return cachedTable(prices, TABLE_TTL, () => getAllData<PriceRow>(prices, 'card_code'), pricesByCardCode, await catalogueVersion(language), true);
}

function pricesByCardCode(rows: PriceRow[]): Record<string, PriceData> {
	const pricesObject: Record<string, PriceData> = {};
	for (const price of rows) {
		pricesObject[price.card_code] = toPrice(price);
	}
	return pricesObject;
}

export async function getSets(language: Language = 'en'): Promise<Set[]> {
	const { sets } = CATALOGUES[language].tables;
	const files = await buildStaticFiles();
	return cachedTable(sets, TABLE_TTL, () => getAllData<SetRow>(sets, 'set_id', '*', { ascending: true, column: 'name' }), rows => rows.map(set => toSet(set, files)), await catalogueVersion(language));
}

/** Keyed on the memoized set list, like `slugIndexes`. */
const setSlugIndexes = new WeakMap<Set[], Map<string, Set>>();

/**
 * The set a URL slug names, compared in NFC and lowercase like `findCardBySlug`. Set slugs are unique in the three catalogues (`verify` and `check` fail on a
 * duplicate; the two Japanese sets named "レイジングサーフ" differ by set id), but the earliest `releaseDate` keeps a slug two sets would share,
 * so the pick never depends on the order the table is read in.
 * `canonical` is the set's own slug: the caller redirects to it when it differs from the one requested.
 */
export async function findSetBySlug(language: Language, slug: string): Promise<{ canonical: string; set: Set } | null> {
	const sets = await getSets(language);
	let index = setSlugIndexes.get(sets);

	if (!index) {
		index = new Map();
		const released = (set: Set) => new Date(set.releaseDate).getTime() || Infinity;

		for (const set of sets) {
			const key = setSlug(set, language);
			const kept = index.get(key);
			if (!kept || released(set) < released(kept)) index.set(key, set);
		}

		setSlugIndexes.set(sets, index);
	}

	const set = index.get(slug.normalize('NFC').toLowerCase());
	return set ? { canonical: setSlug(set, language), set } : null;
}

type OwnedList = 'collection' | 'wishlist';

/** An owned card with its copy count, the catalogue that resolved it and its `cardPrice()`. */
export interface OwnedCard extends FullCard {
	copies: number;
	language: Language;
	price: number | null;
}

/** The card count and summed price of one whole set. */
interface SetTotal {
	cards: number;
	language: Language;
	set_id: string;
	value: number;
}

/** `rows` and `codes` count the orphan rows too (codes no table carries), which `cards` never holds. `sets` is filled by `withSets` only. */
export interface OwnedCards {
	cards: OwnedCard[];
	codes: number;
	rows: number;
	sets: SetTotal[];
}

/** What `owned_cards` returns: `jsonb_strip_nulls` leaves the null columns off a card, and `toCard` reads a missing key like a null. */
interface OwnedRows extends Omit<OwnedCards, 'cards'> {
	cards: (Partial<CardRow> & Pick<CardRow, 'card_code' | 'name'> & { copies: number; language: Language; price?: number })[];
}

/**
 * One user's collection or wishlist resolved against the three catalogues, in one database call (the `owned_cards` SQL function): no table is loaded.
 * Pass `locals.supabase` or the anonymous client, never a service-role one: row level security is the privacy gate, a private list comes back empty.
 * Cards come ordered en, ja, fr, each by name then code. Orphan rows count in `rows` and `codes` but never come back as cards.
 */
export async function getOwnedCards(client: SupabaseClient, username: string, list: OwnedList, withSets = false): Promise<OwnedCards> {
	const { data: result } = await readWithRetry(`call owned_cards ${list} ${username}`, () => client.rpc('owned_cards', { p_list: list, p_username: username, p_with_sets: withSets }));
	/** The untyped client reads every rpc result as a row array, like in `getCardVersions`. */
	const { cards, codes, rows, sets } = result as OwnedRows;

	return {
		cards: cards.map(({ copies, language, price, ...row }) => {
			const card = toCard(row as CardRow);
			delete card.cardMarketUpdatedAt;
			return { ...card, copies, language, price: price ?? null };
		}),
		codes,
		rows,
		sets,
	};
}

/** What one catalogue holds: its card list, its price table and its sets. */
interface CatalogueData {
	cards: FullCard[];
	prices: Record<string, PriceData>;
	sets: Set[];
}

/** The three reads of one language, memoized like each of them. */
export async function getCatalogue(language: Language): Promise<CatalogueData> {
	const [cards, prices, sets] = await Promise.all([getCards(language), getPrices(language), getSets(language)]);
	return { cards, prices, sets };
}

export async function getTypes(): Promise<string[]> {
	return cachedTable('types', STATIC_TTL, () => getAllData<{ name: string }>('types', 'name', 'name', { ascending: true, column: 'name' }), rows => rows.map(type => type.name));
}

