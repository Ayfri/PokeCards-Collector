import * as fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { CARDS, JP_CARDS, JP_PRICES, JP_SETS, POKEMONS, PRICES, SETS, TYPES } from './files';
import { cardRow, priceRow, setRow } from './rows';
import { type MappedCard, type MappedPrice, type MappedSet } from './tcgdex/mappers';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Supabase URL or key is missing. Check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

/** Upserts in batches; Supabase rejects a single statement carrying tens of thousands of rows. */
async function upsertAll(table: string, rows: Record<string, unknown>[], onConflict: string, batchSize = 500): Promise<void> {
	for (let index = 0; index < rows.length; index += batchSize) {
		const { error } = await supabase.from(table).upsert(rows.slice(index, index + batchSize), { onConflict });
		if (error) throw new Error(`Error upserting ${table} at ${index}: ${error.message}`);
		if (index % (batchSize * 10) === 0 && index > 0) console.log(`  ${table}: ${index}/${rows.length}`);
	}
	console.log(`✅ Upserted ${rows.length} rows into ${table}`);
}

/** Deduplicates on the primary key, keeping the last occurrence, and reports what it dropped. */
function deduplicate(rows: Record<string, unknown>[], key: string, label: string): Record<string, unknown>[] {
	const byKey = new Map<unknown, Record<string, unknown>>();
	for (const row of rows) byKey.set(row[key], row);
	if (byKey.size !== rows.length) console.log(`  ${label}: ${rows.length} → ${byKey.size} (${rows.length - byKey.size} duplicates)`);
	return [...byKey.values()];
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

async function uploadSetsTo(table: string, path: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const sets = read<MappedSet[]>(path);

	await upsertAll(table, sets.map(setRow), 'set_id', 100);
}

export const uploadSets = () => uploadSetsTo('sets', SETS);
export const uploadJapaneseSets = () => uploadSetsTo('jp_sets', JP_SETS);

/**
 * Replaces a card table wholesale with the TCGdex content: everything is upserted, then the rows no
 * TCGdex card claimed are deleted. `collections` and `wishlists` are never touched - a row pointing at a
 * card TCGdex does not have yet is kept and renders again once the upstream database fills the set in.
 */
async function uploadCardsTo(table: string, path: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const cards = read<MappedCard[]>(path);

	const rows = cards.map(cardRow);

	await upsertAll(table, deduplicate(rows, 'card_code', table), 'card_code');

	const { error, count } = await supabase.from(table).delete({ count: 'exact' }).is('tcgdex_id', null);
	if (error) throw new Error(`Error dropping legacy ${table} rows: ${error.message}`);
	console.log(`🧹 Dropped ${count ?? 0} ${table} rows TCGdex no longer has`);
}

export const uploadCards = () => uploadCardsTo('cards', CARDS);
export const uploadJapaneseCards = () => uploadCardsTo('jp_cards', JP_CARDS);

async function uploadPricesTo(table: string, path: string): Promise<void> {
	console.log(`📤 Uploading ${table}...`);
	const prices = read<Record<string, MappedPrice>>(path);

	const rows = Object.entries(prices).map(([cardCode, price]) => priceRow(cardCode, price));

	await upsertAll(table, rows, 'card_code');
}

export const uploadPrices = () => uploadPricesTo('prices', PRICES);
export const uploadJapanesePrices = () => uploadPricesTo('jp_prices', JP_PRICES);

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
