import * as fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase pour le CLI
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Supabase URL or Anon Key is missing. Check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour les données
interface PokemonData {
	id: number;
	name: string;
	description: string;
	evolves_to?: number[];
	evolves_from?: number;
}

interface TypeData {
	name: string;
}

interface SetData {
	name: string;
	logo?: string;
	printedTotal?: number;
	ptcgoCode?: string;
	releaseDate?: string;
	series?: string;
}

interface CardData {
	cardCode: string;
	artist?: string;
	cardMarketUpdatedAt?: string;
	cardMarketUrl?: string;
	image?: string;
	name: string;
	pokemonId?: number;
	rarity?: string;
	setName?: string;
	supertype?: string;
	types?: string;
}

interface PriceData {
	cardCode: string;
	simple?: number;
	low?: number;
	trend?: number;
	avg1?: number;
	avg7?: number;
	avg30?: number;
	reverseSimple?: number;
	reverseLow?: number;
	reverseTrend?: number;
	reverseAvg1?: number;
	reverseAvg7?: number;
	reverseAvg30?: number;
}

const PROJECT_ID = 'ptbwuqaqkqntmgmaqboq';

// Fonction utilitaire pour échapper les valeurs SQL
function escapeSqlValue(value: any): string {
	if (value === null || value === undefined) {
		return 'NULL';
	}
	if (typeof value === 'string') {
		return `'${value.replace(/'/g, "''")}'`;
	}
	if (typeof value === 'number') {
		return value.toString();
	}
	if (Array.isArray(value)) {
		return `ARRAY[${value.map(v => escapeSqlValue(v)).join(',')}]`;
	}
	return `'${String(value).replace(/'/g, "''")}'`;
}

// Upload des types Pokémon
export async function uploadTypes() {
	console.log('📤 Uploading Pokémon types...');
	
	const typesPath = 'src/assets/types.json';
	if (!fs.existsSync(typesPath)) {
		throw new Error(`File not found: ${typesPath}`);
	}

	const typesData: string[] = JSON.parse(fs.readFileSync(typesPath, 'utf-8'));
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('types').delete().neq('name', '');
	if (deleteError) {
		throw new Error(`Error clearing types: ${deleteError.message}`);
	}
	
	// Insert types
	const typesToInsert = typesData.map(name => ({ name }));
	const { error: insertError } = await supabase
		.from('types')
		.insert(typesToInsert);
		
	if (insertError) {
		throw new Error(`Error inserting types: ${insertError.message}`);
	}
	
	console.log(`✅ Uploaded ${typesData.length} types`);
}

// Upload des Pokémon
export async function uploadPokemons() {
	console.log('📤 Uploading Pokémon data...');
	
	const pokemonsPath = 'src/assets/pokemons-full.json';
	if (!fs.existsSync(pokemonsPath)) {
		throw new Error(`File not found: ${pokemonsPath}`);
	}

	const pokemonsData: PokemonData[] = JSON.parse(fs.readFileSync(pokemonsPath, 'utf-8'));
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('pokemons').delete().neq('id', 0);
	if (deleteError) {
		throw new Error(`Error clearing pokemons: ${deleteError.message}`);
	}
	
	// Insert pokemons in batches
	const batchSize = 100;
	for (let i = 0; i < pokemonsData.length; i += batchSize) {
		const batch = pokemonsData.slice(i, i + batchSize);
		
		// Transform data to ensure compatibility with the table structure
		const pokemonsToInsert = batch.map(pokemon => ({
			id: pokemon.id,
			name: pokemon.name,
			description: pokemon.description,
			evolves_to: pokemon.evolves_to || null,
			evolves_from: pokemon.evolves_from || null
		}));
		
		const { error } = await supabase
			.from('pokemons')
			.insert(pokemonsToInsert);
			
		if (error) {
			throw new Error(`Error inserting pokemon batch ${i}: ${error.message}`);
		}
		
		if (i % 300 === 0) {
			console.log(`  Processed ${i}/${pokemonsData.length} Pokémon...`);
		}
	}
	
	console.log(`✅ Uploaded ${pokemonsData.length} Pokémon`);
}

// Upload des sets (non-japonais)
export async function uploadSets() {
	console.log('📤 Uploading card sets...');
	
	const setsPath = 'src/assets/sets-full.json';
	if (!fs.existsSync(setsPath)) {
		throw new Error(`File not found: ${setsPath}`);
	}

	const setsData: SetData[] = JSON.parse(fs.readFileSync(setsPath, 'utf-8'));
	
	// Transform data to match database schema
	const setsToInsert = setsData.map(set => ({
		name: set.name,
		logo: set.logo || null,
		printed_total: set.printedTotal || null,
		ptcgo_code: set.ptcgoCode || null,
		release_date: set.releaseDate || null,
		series: set.series || null
	}));
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('sets').delete().neq('name', '');
	if (deleteError) {
		throw new Error(`Error clearing sets: ${deleteError.message}`);
	}
	
	// Insert sets in batches
	const batchSize = 50;
	for (let i = 0; i < setsToInsert.length; i += batchSize) {
		const batch = setsToInsert.slice(i, i + batchSize);
		
		const { error } = await supabase
			.from('sets')
			.insert(batch);
			
		if (error) {
			throw new Error(`Error inserting sets batch ${i}: ${error.message}`);
		}
	}
	
	console.log(`✅ Uploaded ${setsData.length} sets`);
}

// Upload des sets japonais
export async function uploadJapaneseSets() {
	console.log('📤 Uploading Japanese card sets...');
	
	const jpSetsPath = 'src/assets/jp-sets-full.json';
	if (!fs.existsSync(jpSetsPath)) {
		throw new Error(`File not found: ${jpSetsPath}`);
	}

	const jpSetsData: SetData[] = JSON.parse(fs.readFileSync(jpSetsPath, 'utf-8'));
	
	// Transform data to match database schema
	const setsToInsert = jpSetsData.map(set => ({
		name: set.name,
		logo: set.logo || null,
		printed_total: set.printedTotal || null,
		ptcgo_code: set.ptcgoCode || null,
		release_date: set.releaseDate || null,
		series: set.series || null
	}));
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('jp_sets').delete().neq('name', '');
	if (deleteError) {
		throw new Error(`Error clearing jp_sets: ${deleteError.message}`);
	}
	
	// Insert Japanese sets in batches
	const batchSize = 50;
	for (let i = 0; i < setsToInsert.length; i += batchSize) {
		const batch = setsToInsert.slice(i, i + batchSize);
		
		const { error } = await supabase
			.from('jp_sets')
			.insert(batch);
			
		if (error) {
			throw new Error(`Error inserting jp_sets batch ${i}: ${error.message}`);
		}
	}
	
	console.log(`✅ Uploaded ${jpSetsData.length} Japanese sets`);
}

// Upload des cartes (non-japonaises)
export async function uploadCards() {
	console.log('📤 Uploading cards...');
	
	const cardsPath = 'src/assets/cards-full.json';
	if (!fs.existsSync(cardsPath)) {
		throw new Error(`File not found: ${cardsPath}`);
	}

	const cardsContent = fs.readFileSync(cardsPath, 'utf-8');
	const cardsData: CardData[] = JSON.parse(cardsContent);
	
	// Get list of valid set names from the database
	const { data: validSets, error: setsError } = await supabase
		.from('sets')
		.select('name');
		
	if (setsError) {
		throw new Error(`Error fetching valid sets: ${setsError.message}`);
	}
	
	const validSetNames = new Set(validSets.map(set => set.name));
	
	// Transform data to match database schema
	const cardsTransformed = cardsData.map(card => ({
		card_code: card.cardCode,
		artist: card.artist || null,
		card_market_updated_at: card.cardMarketUpdatedAt || null,
		card_market_url: card.cardMarketUrl || null,
		image: card.image || null,
		name: card.name,
		pokemon_id: card.pokemonId || null,
		rarity: card.rarity || null,
		set_name: (card.setName && validSetNames.has(card.setName)) ? card.setName : null,
		supertype: card.supertype || null,
		types: card.types || null
	}));
	
	// Deduplicate by card_code (keep last occurrence)
	const cardMap = new Map();
	const duplicates: { card_code: string; name: string; set_name: string | null }[] = [];
	
	cardsTransformed.forEach(card => {
		if (cardMap.has(card.card_code)) {
			duplicates.push({
				card_code: card.card_code,
				name: card.name,
				set_name: card.set_name
			});
		}
		cardMap.set(card.card_code, card);
	});
	
	const cardsToInsert = Array.from(cardMap.values());
	
	console.log(`  Deduplicated: ${cardsData.length} → ${cardsToInsert.length} cards (removed ${cardsData.length - cardsToInsert.length} duplicates)`);
	
	if (duplicates.length > 0) {
		console.log(`  📋 Duplicate cards found:`);
		duplicates.slice(0, 10).forEach(dup => {
			console.log(`    - ${dup.card_code} (${dup.name} - ${dup.set_name || 'No Set'})`);
		});
		if (duplicates.length > 10) {
			console.log(`    ... and ${duplicates.length - 10} more duplicates`);
		}
	}
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('cards').delete().neq('card_code', '');
	if (deleteError) {
		throw new Error(`Error clearing cards: ${deleteError.message}`);
	}
	
	// Count invalid sets for reporting
	const invalidSets = cardsData.filter(card => card.setName && !validSetNames.has(card.setName));
	if (invalidSets.length > 0) {
		const uniqueInvalidSets = [...new Set(invalidSets.map(card => card.setName))];
		console.log(`⚠️  Found ${invalidSets.length} cards with invalid set names: ${uniqueInvalidSets.slice(0, 5).join(', ')}${uniqueInvalidSets.length > 5 ? '...' : ''}`);
	}
	
	// Insert cards in smaller batches to avoid memory issues
	const batchSize = 25;
	for (let i = 0; i < cardsToInsert.length; i += batchSize) {
		const batch = cardsToInsert.slice(i, i + batchSize);
		
		const { error } = await supabase
			.from('cards')
			.upsert(batch, { onConflict: 'card_code' });
			
		if (error) {
			throw new Error(`Error inserting cards batch ${i}: ${error.message}`);
		}
		
		// Progress indicator
		if (i % 500 === 0) {
			console.log(`  Processed ${i}/${cardsToInsert.length} cards...`);
		}
	}
	
	console.log(`✅ Uploaded ${cardsToInsert.length} cards`);
}

// Upload des cartes japonaises
export async function uploadJapaneseCards() {
	console.log('📤 Uploading Japanese cards...');
	
	const jpCardsPath = 'src/assets/jp-cards-full.json';
	if (!fs.existsSync(jpCardsPath)) {
		throw new Error(`File not found: ${jpCardsPath}`);
	}

	const jpCardsContent = fs.readFileSync(jpCardsPath, 'utf-8');
	const jpCardsData: CardData[] = JSON.parse(jpCardsContent);
	
	// Get list of valid set names from the database (check both sets and jp_sets)
	const { data: validSets, error: setsError } = await supabase
		.from('jp_sets')
		.select('name');
		
	if (setsError) {
		throw new Error(`Error fetching valid Japanese sets: ${setsError.message}`);
	}
	
	const validSetNames = new Set(validSets.map(set => set.name));
	
	// Transform data to match database schema
	const cardsTransformed = jpCardsData.map(card => ({
		card_code: card.cardCode,
		artist: card.artist || null,
		card_market_updated_at: card.cardMarketUpdatedAt || null,
		card_market_url: card.cardMarketUrl || null,
		image: card.image || null,
		name: card.name,
		pokemon_id: card.pokemonId || null,
		rarity: card.rarity || null,
		set_name: (card.setName && validSetNames.has(card.setName)) ? card.setName : null,
		supertype: card.supertype || null,
		types: card.types || null
	}));
	
	// Deduplicate by card_code (keep last occurrence)
	const cardMap = new Map();
	const duplicates: { card_code: string; name: string; set_name: string | null }[] = [];
	
	cardsTransformed.forEach(card => {
		if (cardMap.has(card.card_code)) {
			duplicates.push({
				card_code: card.card_code,
				name: card.name,
				set_name: card.set_name
			});
		}
		cardMap.set(card.card_code, card);
	});
	
	const cardsToInsert = Array.from(cardMap.values());
	
	console.log(`  Deduplicated: ${jpCardsData.length} → ${cardsToInsert.length} Japanese cards (removed ${jpCardsData.length - cardsToInsert.length} duplicates)`);
	
	if (duplicates.length > 0) {
		console.log(`  📋 Duplicate Japanese cards found:`);
		duplicates.slice(0, 10).forEach(dup => {
			console.log(`    - ${dup.card_code} (${dup.name} - ${dup.set_name || 'No Set'})`);
		});
		if (duplicates.length > 10) {
			console.log(`    ... and ${duplicates.length - 10} more duplicates`);
		}
	}
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('jp_cards').delete().neq('card_code', '');
	if (deleteError) {
		throw new Error(`Error clearing jp_cards: ${deleteError.message}`);
	}
	
	// Count invalid sets for reporting
	const invalidSets = jpCardsData.filter(card => card.setName && !validSetNames.has(card.setName));
	if (invalidSets.length > 0) {
		const uniqueInvalidSets = [...new Set(invalidSets.map(card => card.setName))];
		console.log(`⚠️  Found ${invalidSets.length} Japanese cards with invalid set names: ${uniqueInvalidSets.slice(0, 5).join(', ')}${uniqueInvalidSets.length > 5 ? '...' : ''}`);
	}
	
	// Insert Japanese cards in smaller batches
	const batchSize = 25;
	for (let i = 0; i < cardsToInsert.length; i += batchSize) {
		const batch = cardsToInsert.slice(i, i + batchSize);
		
		const { error } = await supabase
			.from('jp_cards')
			.upsert(batch, { onConflict: 'card_code' });
			
		if (error) {
			throw new Error(`Error inserting jp_cards batch ${i}: ${error.message}`);
		}
		
		// Progress indicator
		if (i % 500 === 0) {
			console.log(`  Processed ${i}/${cardsToInsert.length} Japanese cards...`);
		}
	}
	
	console.log(`✅ Uploaded ${cardsToInsert.length} Japanese cards`);
}

// Upload des prix
export async function uploadPrices() {
	console.log('📤 Uploading prices...');
	
	const pricesPath = 'src/assets/prices.json';
	if (!fs.existsSync(pricesPath)) {
		throw new Error(`File not found: ${pricesPath}`);
	}

	const pricesContent = fs.readFileSync(pricesPath, 'utf-8');
	const pricesObject: Record<string, Omit<PriceData, 'cardCode'>> = JSON.parse(pricesContent);
	
	// Convert object to array and transform data to match database schema
	const pricesTransformed = Object.entries(pricesObject).map(([cardCode, priceData]) => ({
		card_code: cardCode,
		simple: priceData.simple || null,
		low: priceData.low || null,
		trend: priceData.trend || null,
		avg1: priceData.avg1 || null,
		avg7: priceData.avg7 || null,
		avg30: priceData.avg30 || null,
		reverse_simple: priceData.reverseSimple || null,
		reverse_low: priceData.reverseLow || null,
		reverse_trend: priceData.reverseTrend || null,
		reverse_avg1: priceData.reverseAvg1 || null,
		reverse_avg7: priceData.reverseAvg7 || null,
		reverse_avg30: priceData.reverseAvg30 || null
	}));
	
	// Deduplicate by card_code (keep last occurrence)
	const priceMap = new Map();
	const duplicates: { card_code: string }[] = [];
	
	pricesTransformed.forEach(price => {
		if (priceMap.has(price.card_code)) {
			duplicates.push({
				card_code: price.card_code
			});
		}
		priceMap.set(price.card_code, price);
	});
	
	const pricesToInsert = Array.from(priceMap.values());
	
	const originalCount = Object.keys(pricesObject).length;
	console.log(`  Deduplicated: ${originalCount} → ${pricesToInsert.length} prices (removed ${originalCount - pricesToInsert.length} duplicates)`);
	
	if (duplicates.length > 0) {
		console.log(`  📋 Duplicate prices found:`);
		duplicates.slice(0, 10).forEach(dup => {
			console.log(`    - ${dup.card_code}`);
		});
		if (duplicates.length > 10) {
			console.log(`    ... and ${duplicates.length - 10} more duplicates`);
		}
	}
	
	// Clear existing data
	const { error: deleteError } = await supabase.from('prices').delete().neq('card_code', '');
	if (deleteError) {
		throw new Error(`Error clearing prices: ${deleteError.message}`);
	}
	
	// Insert prices in batches
	const batchSize = 50;
	for (let i = 0; i < pricesToInsert.length; i += batchSize) {
		const batch = pricesToInsert.slice(i, i + batchSize);
		
		const { error } = await supabase
			.from('prices')
			.upsert(batch, { onConflict: 'card_code' });
			
		if (error) {
			throw new Error(`Error inserting prices batch ${i}: ${error.message}`);
		}
		
		// Progress indicator
		if (i % 1000 === 0) {
			console.log(`  Processed ${i}/${pricesToInsert.length} prices...`);
		}
	}
	
	console.log(`✅ Uploaded ${pricesToInsert.length} prices`);
}

// Upload de toutes les données dans l'ordre correct
export async function uploadAllData() {
	console.log('🚀 Starting full Supabase data upload...');
	
	try {
		// Upload dans l'ordre des dépendances
		await uploadTypes();
		await uploadPokemons();
		await uploadSets();
		await uploadJapaneseSets();
		await uploadCards();
		await uploadJapaneseCards();
		await uploadPrices();
		
		console.log('🎉 All data uploaded successfully to Supabase!');
	} catch (error) {
		console.error('❌ Error during upload:', error);
		throw error;
	}
} 