import type { FullCard, Pokemon, PriceData, Set } from '#lib/types.js';
import type { CardDetails, CardListRow, CardVersions, PriceRow, SetRow } from '#helpers/catalogue-snapshot.ts';
import { catalogueObject, manifestObject } from '#helpers/data-cache.ts';
import { CATALOGUES, type Language, type LanguagePaths, LANGUAGES } from '#helpers/catalogues.ts';
import { type CardLink, cardPath, cardSlug, cardSlugParts, memoizedOn, setPath, setsById, setSlug } from '#helpers/card-utils.ts';
import { mirrorPath } from '#helpers/set-images.ts';
import setTwinsJson from '#scrapers/tcgdex/jp-set-twins.json' with { type: 'json' };
import type { SupabaseClient } from '@supabase/supabase-js';

const SET_TWINS: Record<'en' | 'ja', Partial<Record<string, string>>> = setTwinsJson;

function toCard(card: CardListRow): FullCard {
	return {
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
 * (every route and asset) in any client bundle that pulls this module in. A failed import is forgotten so the next
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

export async function getPokemons(): Promise<Pokemon[]> {
	return catalogueObject('pokemons', rows => rows);
}

export async function getCards(language: Language = 'en'): Promise<FullCard[]> {
	return catalogueObject(CATALOGUES[language].tables.cards, rows => rows.map(toCard), true);
}

/** What a card page reads beyond the list card, by `cardCode`. A separate object, so none of it travels in the card list payloads. */
function cardDetails(language: Language): Promise<Record<string, CardDetails>> {
	return catalogueObject(`${CATALOGUES[language].tables.cards}:details`, details => details, true);
}

/** Each card's twin page paths in the other catalogues, precomputed by the publisher. Only the card's own language is ever read for a lookup. */
function cardVersions(language: Language): Promise<CardVersions> {
	return catalogueObject(`${CATALOGUES[language].tables.cards}:versions`, versions => versions, true);
}

type TwinPaths = Record<'en' | 'fr', string>;

const twinPathsMemo = new WeakMap<object, unknown>();

/**
 * The page paths of an English card and its French twin, by `cardCode` of `language`, for the cards that have one. Memoized on the identity of the
 * two reads behind it (the card list and its versions), since each one is replaced on its own, and the memo keeps none of them alive.
 */
export async function getTwinPaths(language: 'en' | 'fr'): Promise<Map<string, TwinPaths>> {
	const other = language === 'en' ? 'fr' : 'en';
	const [cards, versions] = await Promise.all([getCards(language), cardVersions(language)]);

	return memoizedOn(twinPathsMemo, [cards, versions], () => {
		const twins = new Map<string, TwinPaths>();
		for (const card of cards) {
			const twin = versions[card.cardCode]?.[other];
			if (!twin) continue;

			twins.set(card.cardCode, language === 'en' ? { en: cardPath('en', card), fr: twin } : { en: twin, fr: cardPath('fr', card) });
		}

		return twins;
	});
}

/** A random English card, with the fields its URL is built from. */
export async function getRandomCard(): Promise<(CardLink & { cardCode: string }) | null> {
	const cards = await getCards();
	return cards[Math.floor(Math.random() * cards.length)] ?? null;
}

interface SlugIndex {
	bySlug: Map<string, FullCard>;
	/** `set-number` of the slug, only for a card that has both parts, so a URL with a wrong or stale name part still finds its card. */
	byTail: Map<string, FullCard>;
}

/** Keyed on the memoized card list, so the index is rebuilt exactly when `catalogueObject` hands out a fresh one. */
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

const cardIndexMemo = new WeakMap<object, unknown>();

/** Keyed on the memoized list like `slugIndexes`, so the map goes with a refreshed table (rule 2). For a read that resolves many codes without a scan each. */
export async function getCardIndex(language: Language): Promise<ReadonlyMap<string, FullCard>> {
	const cards = await getCards(language);
	return memoizedOn(cardIndexMemo, [cards], () => new Map(cards.map(card => [card.cardCode, card])));
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

/** A card's URL fields by code, from the memoized card list: the legacy `/card/<cardCode>` redirect. */
export async function findCardLinkByCode(language: Language, cardCode: string): Promise<(CardLink & { cardCode: string }) | null> {
	const card = (await getCardIndex(language)).get(cardCode);
	return card ? { cardCode: card.cardCode, localId: card.localId, name: card.name, setId: card.setId, setName: card.setName } : null;
}

/**
 * One card with the details only its own page reads (`hp`, `stage`, `regulationMark`, `tcgdexId`). The list card keeps `hp` and `stage` only when it has
 * no scan, so they come from the details for every card. A new object: the list card is memoized and shared with every request and the grid payloads.
 * The list and the details can come from two manifests during a refresh, so a card the details lack gets empty ones.
 */
export async function getCardDetails(language: Language, cardCode: string): Promise<FullCard | null> {
	const [index, details] = await Promise.all([getCardIndex(language), cardDetails(language)]);
	const card = index.get(cardCode);
	if (!card) return null;

	const [hp, stage, regulationMark, tcgdexId] = details[cardCode] ?? [null, '', '', ''];
	/** A null HP stays off the object like the other optional keys: devalue writes an undefined one as `void 0`. */
	return { ...card, ...(hp != null && { hp }), regulationMark, stage, tcgdexId };
}

/** One card's price, from the memoized price table. */
export async function getCardPrice(language: Language, cardCode: string): Promise<PriceData | null> {
	const prices = await getPrices(language);
	return Object.hasOwn(prices, cardCode) ? prices[cardCode] : null;
}

/**
 * The same card in the other catalogues, from the `:versions` object the publisher builds. English and French cards share their TCGdex id, and a
 * Japanese card stores the English id of its twin in `twin_tcgdex_id`, so the English id is the key: a Japanese card reads it from its own row, the other two use their `tcgdex_id`.
 * Several Japanese prints can share one English twin, and the first `card_code` stands for them so the link never changes between visits.
 * A card with no id, or a Japanese card with no twin, only has itself, and an unknown code has nothing. Only the card's own language is loaded.
 */
export async function getCardVersions(language: Language, cardCode: string): Promise<LanguagePaths> {
	const [index, versions] = await Promise.all([getCardIndex(language), cardVersions(language)]);
	const card = index.get(cardCode);
	if (!card) return {};

	return { [language]: cardPath(language, card), ...versions[cardCode] };
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

/** The manifest records each object's row count, so the homepage and the sitemaps print it without loading the 12781 rows behind it. */
export async function countCards(language: Language): Promise<number> {
	return (await manifestObject(CATALOGUES[language].tables.cards)).rows;
}

export async function getPrices(language: Language = 'en'): Promise<Record<string, PriceData>> {
	return catalogueObject(CATALOGUES[language].tables.prices, pricesByCardCode, true);
}

function pricesByCardCode(rows: PriceRow[]): Record<string, PriceData> {
	const pricesObject: Record<string, PriceData> = {};
	for (const price of rows) {
		pricesObject[price.card_code] = toPrice(price);
	}
	return pricesObject;
}

export async function getSets(language: Language = 'en'): Promise<Set[]> {
	const files = await buildStaticFiles();
	return catalogueObject(CATALOGUES[language].tables.sets, rows => rows.map(set => toSet(set, files)));
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
	cards: (Partial<CardListRow> & Pick<CardListRow, 'card_code' | 'name'> & { copies: number; language: Language; price?: number })[];
}

/**
 * One user's collection or wishlist resolved against the three catalogues, in one database call (the `owned_cards` SQL function): no table is loaded.
 * Pass `locals.supabase` or the anonymous client, never a service-role one: row level security is the privacy gate, a private list comes back empty.
 * Cards come ordered en, ja, fr, each by name then code. Orphan rows count in `rows` and `codes` but never come back as cards.
 * A failed call throws, with no retry: the caller decides what a missing list means.
 */
export async function getOwnedCards(client: SupabaseClient, username: string, list: OwnedList, withSets = false): Promise<OwnedCards> {
	const { data: result, error } = await client.rpc('owned_cards', { p_list: list, p_username: username, p_with_sets: withSets });
	if (error) throw new Error(`Failed to call owned_cards ${list} ${username}: ${error.message}`);

	/** The untyped client reads every rpc result as a row array, and `overrideTypes` refuses to cast an array to the object this scalar function returns. */
	const { cards, codes, rows, sets } = result as OwnedRows;

	return {
		cards: cards.map(({ copies, language, price, ...row }) => {
			const card = toCard(row as CardListRow);
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
	return catalogueObject('types', rows => rows.map(type => type.name));
}
