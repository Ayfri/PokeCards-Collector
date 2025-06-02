import type { Card, FullCard, Pokemon, PriceData, Set } from "$lib/types";
import { supabase } from '$lib/supabase';

// Fonction utilitaire pour récupérer toutes les données avec pagination
async function getAllData<T>(
	tableName: string,
	selectQuery: string = '*',
	orderBy?: { column: string; ascending: boolean }
): Promise<T[]> {
	let allData: T[] = [];
	let from = 0;
	const batchSize = 1000;
	let hasMore = true;

	while (hasMore) {
		let query = supabase
			.from(tableName)
			.select(selectQuery)
			.range(from, from + batchSize - 1);

		if (orderBy) {
			query = query.order(orderBy.column, { ascending: orderBy.ascending });
		}

		const { data, error } = await query;

		if (error) {
			console.error(`Error fetching ${tableName}:`, error);
			throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
		}

		if (data && data.length > 0) {
			allData.push(...(data as T[]));
			from += batchSize;
			hasMore = data.length === batchSize;
		} else {
			hasMore = false;
		}
	}

	return allData;
}

export async function getPokemons(): Promise<Pokemon[]> {
	return await getAllData<Pokemon>('pokemons', '*', { column: 'id', ascending: true });
}

export async function getCards(): Promise<FullCard[]> {
	const data = await getAllData<any>('cards', `
		card_code,
		artist,
		card_market_updated_at,
		card_market_url,
		image,
		name,
		pokemon_id,
		rarity,
		set_name,
		supertype,
		types
	`, { column: 'name', ascending: true });
	
	// Transform database format to FullCard format
	return data.map(card => ({
		cardCode: card.card_code,
		artist: card.artist || '',
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		image: card.image || '',
		meanColor: '', // This field is not in database, set default
		name: card.name,
		pokemonNumber: card.pokemon_id,
		rarity: card.rarity || '',
		setName: card.set_name || '',
		supertype: card.supertype || '',
		types: card.types || ''
	}));
}

export async function getJapaneseCards(): Promise<FullCard[]> {
	const data = await getAllData<any>('jp_cards', `
		card_code,
		artist,
		card_market_updated_at,
		card_market_url,
		image,
		name,
		pokemon_id,
		rarity,
		set_name,
		supertype,
		types
	`, { column: 'name', ascending: true });
	
	// Transform database format to FullCard format
	return data.map(card => ({
		cardCode: card.card_code,
		artist: card.artist || '',
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		image: card.image || '',
		meanColor: '', // This field is not in database, set default
		name: card.name,
		pokemonNumber: card.pokemon_id,
		rarity: card.rarity || '',
		setName: card.set_name || '',
		supertype: card.supertype || '',
		types: card.types || ''
	}));
}

export async function getPrices(): Promise<Record<string, PriceData>> {
	const data = await getAllData<any>('prices');
	
	// Convert array to object with card_code as key
	const pricesObject: Record<string, PriceData> = {};
	data.forEach(price => {
		pricesObject[price.card_code] = {
			simple: price.simple,
			low: price.low,
			trend: price.trend,
			avg1: price.avg1,
			avg7: price.avg7,
			avg30: price.avg30,
			reverseSimple: price.reverse_simple,
			reverseLow: price.reverse_low,
			reverseTrend: price.reverse_trend,
			reverseAvg1: price.reverse_avg1,
			reverseAvg7: price.reverse_avg7,
			reverseAvg30: price.reverse_avg30
		};
	});
	
	return pricesObject;
}

export async function getSets(): Promise<Set[]> {
	const data = await getAllData<any>('sets', '*', { column: 'name', ascending: true });
	
	return data.map(set => ({
		name: set.name,
		logo: set.logo || '',
		printedTotal: set.printed_total || 0,
		ptcgoCode: set.ptcgo_code || '',
		releaseDate: set.release_date ? new Date(set.release_date) : new Date('1995-01-01'),
		series: set.series || ''
	}));
}

export async function getJapaneseSets(): Promise<Set[]> {
	const data = await getAllData<any>('jp_sets', '*', { column: 'name', ascending: true });
	
	return data.map(set => ({
		name: set.name,
		logo: set.logo || '',
		printedTotal: set.printed_total || 0,
		ptcgoCode: set.ptcgo_code || '',
		releaseDate: set.release_date ? new Date(set.release_date) : new Date('1995-01-01'),
		series: set.series || '',
		aliases: [] // Les alias ne sont pas dans la DB pour l'instant
	}));
}

export async function getTypes(): Promise<string[]> {
	const data = await getAllData<{ name: string }>('types', 'name', { column: 'name', ascending: true });
	return data.map(type => type.name);
}

export async function getRarities(): Promise<string[]> {
	// Pour les raretés, on peut utiliser une requête optimisée
	const { data, error } = await supabase
		.from('cards')
		.select('rarity')
		.not('rarity', 'is', null);
		
	if (error) {
		console.error('Error fetching rarities:', error);
		throw new Error(`Failed to fetch rarities: ${error.message}`);
	}
	
	// Paginer si nécessaire
	if (data && data.length === 1000) {
		// Si on a exactement 1000 résultats, il y en a probablement plus
		const allData = await getAllData<{ rarity: string }>('cards', 'rarity');
		const rarities = [...new Set(allData.map(card => card.rarity).filter(Boolean))];
		return rarities.sort();
	}
	
	const rarities = [...new Set((data || []).map(card => card.rarity))];
	return rarities.sort();
}

export async function getArtists(): Promise<string[]> {
	// Pour les artistes, on peut utiliser une requête optimisée
	const { data, error } = await supabase
		.from('cards')
		.select('artist')
		.not('artist', 'is', null);
		
	if (error) {
		console.error('Error fetching artists:', error);
		throw new Error(`Failed to fetch artists: ${error.message}`);
	}
	
	// Paginer si nécessaire
	if (data && data.length === 1000) {
		// Si on a exactement 1000 résultats, il y en a probablement plus
		const allData = await getAllData<{ artist: string }>('cards', 'artist');
		const artists = [...new Set(allData.map(card => card.artist).filter(Boolean))];
		return artists.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
	}
	
	const artists = [...new Set((data || []).map(card => card.artist))];
	return artists.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

// Fonctions optimisées pour les filtres avec cache
export async function getCardsWithFilters(filters: {
	setName?: string;
	pokemon?: string;
	rarity?: string;
	type?: string;
	artist?: string;
	supertype?: string;
}): Promise<FullCard[]> {
	let query = supabase
		.from('cards')
		.select(`
			card_code,
			artist,
			card_market_updated_at,
			card_market_url,
			image,
			name,
			pokemon_id,
			rarity,
			set_name,
			supertype,
			types
		`);
		
	// Appliquer les filtres
	if (filters.setName) {
		query = query.eq('set_name', filters.setName);
	}
	if (filters.rarity) {
		query = query.eq('rarity', filters.rarity);
	}
	if (filters.artist) {
		query = query.eq('artist', filters.artist);
	}
	if (filters.supertype) {
		query = query.eq('supertype', filters.supertype);
	}
	if (filters.type) {
		query = query.ilike('types', `%${filters.type}%`);
	}
	if (filters.pokemon) {
		query = query.ilike('name', `%${filters.pokemon}%`);
	}
	
	query = query.order('name', { ascending: true });
	
	const { data, error } = await query;
	
	if (error) {
		console.error('Error fetching filtered cards:', error);
		throw new Error(`Failed to fetch filtered cards: ${error.message}`);
	}
	
	// Transform database format to FullCard format
	return (data || []).map(card => ({
		cardCode: card.card_code,
		artist: card.artist || '',
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		image: card.image || '',
		meanColor: '', // This field is not in database, set default
		name: card.name,
		pokemonNumber: card.pokemon_id,
		rarity: card.rarity || '',
		setName: card.set_name || '',
		supertype: card.supertype || '',
		types: card.types || ''
	}));
}

// Fonction pour récupérer une carte spécifique
export async function getCardByCode(cardCode: string): Promise<FullCard | null> {
	const { data, error } = await supabase
		.from('cards')
		.select(`
			card_code,
			artist,
			card_market_updated_at,
			card_market_url,
			image,
			name,
			pokemon_id,
			rarity,
			set_name,
			supertype,
			types
		`)
		.eq('card_code', cardCode)
		.single();
		
	if (error) {
		if (error.code === 'PGRST116') {
			return null; // Carte non trouvée
		}
		console.error('Error fetching card by code:', error);
		throw new Error(`Failed to fetch card: ${error.message}`);
	}
	
	if (!data) return null;
	
	return {
		cardCode: data.card_code,
		artist: data.artist || '',
		cardMarketUpdatedAt: data.card_market_updated_at || '',
		cardMarketUrl: data.card_market_url || '',
		image: data.image || '',
		meanColor: '', // This field is not in database, set default
		name: data.name,
		pokemonNumber: data.pokemon_id,
		rarity: data.rarity || '',
		setName: data.set_name || '',
		supertype: data.supertype || '',
		types: data.types || ''
	};
}

// Fonction pour récupérer les prix d'une carte spécifique
export async function getCardPrice(cardCode: string): Promise<PriceData | null> {
	const { data, error } = await supabase
		.from('prices')
		.select('*')
		.eq('card_code', cardCode)
		.single();
		
	if (error) {
		if (error.code === 'PGRST116') {
			return null; // Prix non trouvé
		}
		console.error('Error fetching card price:', error);
		throw new Error(`Failed to fetch card price: ${error.message}`);
	}
	
	if (!data) return null;
	
	return {
		simple: data.simple,
		low: data.low,
		trend: data.trend,
		avg1: data.avg1,
		avg7: data.avg7,
		avg30: data.avg30,
		reverseSimple: data.reverse_simple,
		reverseLow: data.reverse_low,
		reverseTrend: data.reverse_trend,
		reverseAvg1: data.reverse_avg1,
		reverseAvg7: data.reverse_avg7,
		reverseAvg30: data.reverse_avg30
	};
} 