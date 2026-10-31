import * as fs from 'node:fs';
import { CARDS, JP_CARDS, JP_PRICES, JP_SETS, POKEMONS, PRICES, SETS, TYPES } from './files';
import { cardRow, priceRow, setRow } from './rows';
import { deduplicate, deleteIn, envClient, readAll, upsertRows } from './supabase_sync';
import { resolveCardCode, type Language, type MappedCard, type MappedPrice, type MappedSet } from './tcgdex/mappers';

const supabase = envClient();

interface PokemonData {
	id: number;
	name: string;
	description: string;
	evolves_to?: number[];
	evolves_from?: number;
}

const read = <T>(path: string): T => {
	if (!fs.existsSync(path)) throw new Error(`File not found: ${path}`);
	return JSON.parse(fs.readFileSync(path, 'utf-8')) as T;
};

async function upsertAll(table: string, rows: Record<string, unknown>[], onConflict: string, batchSize?: number): Promise<void> {
	const unique = deduplicate(rows, onConflict);
	if (unique.length !== rows.length) console.log(`  ${table}: ${rows.length - unique.length} duplicate ${onConflict} dropped`);
	console.log(`✅ Upserted ${await upsertRows(supabase, table, unique, onConflict, batchSize)} rows into ${table}`);
}

async function deleteAll(table: string, column: string, values: readonly string[], label: string): Promise<void> {
	console.log(`🧹 Dropped ${await deleteIn(supabase, table, column, values)} ${table} ${label}`);
}

export async function uploadTypes(): Promise<void> {
	console.log('📤 Uploading Pokémon types...');
	const types = read<string[]>(TYPES);

	const { error } = await supabase.from('types').delete().neq('name', '');
	if (error) throw new Error(`Error clearing types: ${error.message}`);

	const { error: insertError } = await supabase.from('types').insert(types.map(name => ({ name })));
	if (insertError) throw new Error(`Error inserting types: ${insertError.message}`);
	console.log(`✅ Uploaded ${types.length} types`);
}

export async function uploadPokemons(): Promise<void> {
	console.log('📤 Uploading Pokémon data...');
	const pokemons = read<PokemonData[]>(POKEMONS);

	await upsertAll('pokemons', pokemons.map(pokemon => ({
		id: pokemon.id,
		name: pokemon.name,
		description: pokemon.description,
		evolves_to: pokemon.evolves_to ?? null,
		evolves_from: pokemon.evolves_from ?? null,
	})), 'id');
}

interface StoredRow {
	card_code: string;
	set_id: string | null;
	tcgdex_id: string | null;
}

const storedRows = (table: string) => readAll<StoredRow>(supabase, table, 'card_code,set_id,tcgdex_id', 'card_code');

/** Scraped `card_code` -> the code the card is stored under, resolved like the Worker sync does. */
function storedCodes(lang: Language, cards: readonly MappedCard[], rows: readonly StoredRow[]): Map<string, string> {
	const byTcgdexId = new Map(rows.flatMap(row => row.tcgdex_id ? [[row.tcgdex_id, row.card_code] as const] : []));
	return new Map(cards.map(card => [card.cardCode, resolveCardCode(lang, card.tcgdexId, byTcgdexId.get(card.tcgdexId), card.cardCode)]));
}

/** The scrape only keeps sets holding a card, so a stored set it no longer has is an emptied or dropped one. */
async function uploadSetsTo(table: string, path: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const sets = read<MappedSet[]>(path);

	await upsertAll(table, sets.map(setRow), 'set_id', 100);

	const scraped = new Set(sets.map(set => set.setId));
	const stored = await readAll<{set_id: string}>(supabase, table, 'set_id', 'set_id');
	await deleteAll(table, 'set_id', stored.map(row => row.set_id).filter(setId => !scraped.has(setId)), 'sets the scrape no longer has');
}

export const uploadSets = () => uploadSetsTo('sets', SETS);
export const uploadJapaneseSets = () => uploadSetsTo('jp_sets', JP_SETS);

/**
 * Replaces a card table with the TCGdex content, deleting first the rows of a scraped set TCGdex no longer lists and
 * the old row of every card changing code (their prices go with them), then upserting. `collections` and `wishlists`
 * are never touched: a code no card holds renders again once TCGdex fills the set in.
 */
async function uploadCardsTo(lang: Language, table: string, path: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const cards = read<MappedCard[]>(path);
	const stored = await storedRows(table);
	const codes = storedCodes(lang, cards, stored);

	const scrapedSets = new Set(cards.map(card => card.setId));
	const target = new Map(cards.map(card => [card.tcgdexId, codes.get(card.cardCode)!]));
	const stale = stored.filter(row => {
		if (!row.tcgdex_id) return true;
		const code = target.get(row.tcgdex_id);
		return code ? code !== row.card_code : scrapedSets.has(row.set_id ?? '');
	}).map(row => row.card_code);
	await deleteAll(table, 'card_code', stale, 'rows TCGdex no longer has or that change code');

	const rows = cards.map(card => cardRow({ ...card, cardCode: codes.get(card.cardCode)! }));
	await upsertAll(table, rows, 'card_code');
}

export const uploadCards = () => uploadCardsTo('en', 'cards', CARDS);
export const uploadJapaneseCards = () => uploadCardsTo('ja', 'jp_cards', JP_CARDS);

/** Upserts the scraped prices under the stored card codes, and drops the price of a scraped card that has none anymore. */
async function uploadPricesTo(lang: Language, table: string, cardsTable: string, path: string, cardsPath: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const prices = read<Record<string, MappedPrice>>(path);
	const cards = read<MappedCard[]>(cardsPath);
	const codes = storedCodes(lang, cards, await storedRows(cardsTable));

	const rows = Object.entries(prices).map(([cardCode, price]) => priceRow(codes.get(cardCode) ?? cardCode, price));
	await upsertAll(table, rows, 'card_code');

	await deleteAll(table, 'card_code', cards.filter(card => !prices[card.cardCode]).map(card => codes.get(card.cardCode)!), 'prices a card lost');
}

export const uploadPrices = () => uploadPricesTo('en', 'prices', 'cards', PRICES, CARDS);
export const uploadJapanesePrices = () => uploadPricesTo('ja', 'jp_prices', 'jp_cards', JP_PRICES, JP_CARDS);

/** Dependency order: cards before prices, which carry a foreign key on `card_code`. */
export async function uploadAllData(): Promise<void> {
	console.log('🚀 Starting full Supabase data upload...');
	await uploadTypes();
	await uploadPokemons();
	await uploadSets();
	await uploadJapaneseSets();
	await uploadCards();
	await uploadJapaneseCards();
	await uploadPrices();
	await uploadJapanesePrices();
	console.log('🎉 All data uploaded successfully to Supabase!');
}
