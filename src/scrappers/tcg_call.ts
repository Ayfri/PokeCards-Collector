import {getAverageColor} from 'fast-average-color-node';
import * as fs from 'node:fs/promises';
import {POKEMONS_COUNT} from '~/constants';
import type {Card} from '$lib/types';
import { CARDS, SETS } from './files';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';

let apiKey = '';
if (process.env.POKEMON_TCG_API_KEY) {
	apiKey = process.env.POKEMON_TCG_API_KEY;
} else {
	throw new Error('Pokémon TCG API key is missing from .env file, key: POKEMON_TCG_API_KEY');
}

const API_BASE_URL = 'https://api.pokemontcg.io/v2';

type FetchedCard = {
	id: string;
	name: string;
	rarity: string;
	images: {
		small: string;
		large: string;
	};
	nationalPokedexNumbers?: number[];
	set: {
		name: string;
	};
	cardmarket: {
		url: string;
		updatedAt: string;
		prices: {
			averageSellPrice: number;
			lowPrice: number;
			trendPrice: number;
			germanProLow: number;
			suggestedPrice: number;
			reverseHoloSell: number;
			reverseHoloLow: number;
			reverseHoloTrend: number;
			lowPriceExPlus: number;
			avg1: number;
			avg7: number;
			avg30: number;
			reverseHoloAvg1: number;
			reverseHoloAvg7: number;
			reverseHoloAvg30: number;
		};
	};
	tcgplayer?: {
		url?: string;
		updatedAt?: string;
		prices?: {
			holofoil?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			reverseHolofoil?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			normal?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			"1stEditionHolofoil"?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			"1stEditionNormal"?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
		};
	};
	types?: string[];
	supertype: string;
	artist?: string;
};

type FetchedCardsResponse = {
	data: FetchedCard[];
};

type FetchedSet = {
	name: string;
	images: {
		logo: string;
	};
	printedTotal: number;
	ptcgoCode: string;
	releaseDate: string; // YYYY/MM/DD
};

type FetchedSetsResponse = {
	data: FetchedSet[];
};

/**
 * Generic retry function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1000, log = true): Promise<T> {
	let attempt = 0;

	while (true) {
		try {
			return await fn();
		} catch (error) {
			attempt++;

			if (attempt > maxRetries) {
				throw error;
			}

			const delay = baseDelay * Math.pow(1.5, attempt) + (Math.random() * baseDelay);
			if (log) {
				console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms...`);
			}
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

/**
 * Fetches data from the Pokemon TCG API with retry mechanism
 */
async function fetchFromApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
	return withRetry(async () => {
		const queryParams = new URLSearchParams(params).toString();
		const url = `${API_BASE_URL}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

		const response = await fetch(url, {
			headers: {
				'X-Api-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('429: Rate limit reached');
			}
			throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
		}

		return await response.json() as T;
	}, 5, 1000);
}

export async function fetchPokemon(name: string, index: number) {
	try {
		const selectFields = 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers,supertype,artist,tcgplayer';
		let query = `nationalPokedexNumbers:${index}`;
		let params = {
			q: query,
			orderBy: 'nationalPokedexNumbers',
			select: selectFields,
			pageSize: '250',
		};

		const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

		if (!response.data.length) {
			const searchName = name.replaceAll('-', ' ');
			console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), no cards found for this Pokémon, retrying with name '${searchName}'...`);

			params = {
				q: `name:"${searchName}"`,
				orderBy: 'nationalPokedexNumbers',
				select: selectFields,
				pageSize: '250',
			};

			return (await fetchFromApi<FetchedCardsResponse>('cards', params)).data;
		}

		return response.data;
	} catch (e) {
		if (!(e instanceof Error)) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${e}, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 1500));
			return fetchPokemon(name, index);
		}

		if (e.message.includes('429')) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), rate limit reached, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 2500));
			return fetchPokemon(name, index);
		}

		// Other errors
		console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${e.message}, retrying...`);
		await new Promise(resolve => setTimeout(resolve, 1500));
		return fetchPokemon(name, index);
	}
}

async function fetchAndFilterSets() {
	const response = await fetchFromApi<FetchedSetsResponse>('sets', {
		select: 'name,images,printedTotal,ptcgoCode,releaseDate',
	});
	const sets = response.data;

	console.log(`Found ${sets.length} sets!`);

	// Create sets data with proper structure
	const setsData = sets.map(set => ({
		name: set.name,
		logo: set.images.logo,
		printedTotal: set.printedTotal,
		ptcgoCode: set.ptcgoCode,
		releaseDate: set.releaseDate,
	}));

	try {
		const cardsJson = JSON.parse(await fs.readFile(CARDS, 'utf-8'));
		const cards = cardsJson.flat() as Card[];
		
		// Filter sets to only keep those that have cards
		const setsWithCards = sets.filter(set => cards.some(card => card.setName === set.name));
		
		// Group sets by ptcgoCode to find duplicates
		const setsByCode = setsWithCards.reduce((acc, set) => {
			if (!set.ptcgoCode) return acc;
			
			if (!acc[set.ptcgoCode]) {
				acc[set.ptcgoCode] = [];
			}
			acc[set.ptcgoCode].push(set);
			return acc;
		}, {} as Record<string, FetchedSet[]>);
		
		// Process each group to merge duplicate sets
		const mergedSets: Array<{
			name: string;
			logo: string | undefined;
			printedTotal: number | undefined;
			ptcgoCode: string | undefined;
			releaseDate: string | undefined;
		}> = [];
		
		for (const [ptcgoCode, codeSetGroup] of Object.entries(setsByCode)) {
			if (codeSetGroup.length === 1) {
				// If only one set with this code, add it directly
				const set = codeSetGroup[0];
				mergedSets.push({
					name: set.name,
					logo: set.images.logo,
					printedTotal: set.printedTotal,
					ptcgoCode: set.ptcgoCode,
					releaseDate: set.releaseDate,
				});
			} else {
				// If multiple sets with the same code, select the primary one with the shortest set code
				console.log(`Found ${codeSetGroup.length} sets with the same ptcgoCode: ${ptcgoCode}`);
				codeSetGroup.forEach(set => {
					console.log(`- ${set.name}, Set code from logo: ${set.images.logo.split('/').at(-2)}`);
				});
				
				// Get the set code from the logo URL (e.g., from https://images.pokemontcg.io/swsh12pt5/logo.png -> swsh12pt5)
				const setsWithCodes = codeSetGroup.map(set => ({
					set,
					setCode: set.images.logo.split('/').at(-2) || ''
				}));
				
				// Sort by set code length to get the shorter one first
				setsWithCodes.sort((a, b) => a.setCode.length - b.setCode.length);
				
				const primarySet = setsWithCodes[0].set;
				const primarySetCode = setsWithCodes[0].setCode;
				
				console.log(`Selected primary set: ${primarySet.name} with set code ${primarySetCode}`);
				
				// Add the primary set to our merged sets list
				mergedSets.push({
					name: primarySet.name,
					logo: primarySet.images.logo,
					printedTotal: primarySet.printedTotal,
					ptcgoCode: primarySet.ptcgoCode,
					releaseDate: primarySet.releaseDate,
				});
			}
		}
		
		// Get any sets that don't have ptcgoCode but have cards
		const setsWithoutCode = setsWithCards
			.filter(set => !set.ptcgoCode)
			.map(set => ({
				name: set.name,
				logo: set.images.logo,
				printedTotal: set.printedTotal,
				ptcgoCode: set.ptcgoCode,
				releaseDate: set.releaseDate,
			}));
		
		// Combine merged sets and sets without codes
		return [...mergedSets, ...setsWithoutCode];
	} catch (error) {
		console.error(`Error reading ${CARDS}`, error);
		return setsData;
	}
}

export async function fetchCards() {
	const cardGroups = [];

	// Get all cards without filtering by supertype
	console.log('Retrieving all cards...');

	let startPage = 1;
	let hasMoreCards = true;
	let totalCards = 0;
	let totalAvailable = 0;

	// Time statistics
	const startTime = Date.now();
	const pageProcessingTimes: number[] = [];

	// Number of pages to process in parallel
	const PAGES_BATCH_SIZE = 10;

	const selectFields = 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers,supertype,artist,tcgplayer';

	while (hasMoreCards) {
		try {
			// Process multiple pages in parallel
			const pageBatchPromises = [];

			for (let i = 0; i < PAGES_BATCH_SIZE; i++) {
				const currentPage = startPage + i;
				pageBatchPromises.push(processPage(currentPage));
			}

			const results = await Promise.allSettled(pageBatchPromises);

			// Check if we've reached the end of pages
			const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{
				cards: any[];
				pageTime: number;
				isLastPage: boolean;
				totalCount?: number;
			}>[];

			if (successfulResults.length === 0) {
				console.log('No pages processed successfully, stopping.');
				hasMoreCards = false;
				continue;
			}

			// Update statistics and cards
			let shouldStop = false;

			for (const result of successfulResults) {
				if (result.value.cards.length > 0) {
					cardGroups.push(result.value.cards);
					totalCards += result.value.cards.length;
					pageProcessingTimes.push(result.value.pageTime);

					// Update total available if we don't have it yet
					if (totalAvailable === 0 && result.value.totalCount) {
						totalAvailable = result.value.totalCount;
						console.log(`Total cards available in API: ${totalAvailable}`);
					}
				}

				if (result.value.isLastPage) {
					shouldStop = true;
				}
			}

			// Calculate time statistics
			const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
			const avgPageTime = pageProcessingTimes.reduce((sum, time) => sum + time, 0) / pageProcessingTimes.length;
			const pagesRemaining = Math.ceil((totalAvailable - totalCards) / 250);
			const estimatedTimeRemaining = pagesRemaining * avgPageTime;

			console.log(`Progress: ${totalCards}/${totalAvailable} cards (${((totalCards/totalAvailable)*100).toFixed(2)}%)`);
			console.log(`Elapsed time: ${elapsedTime.toFixed(2)}s, Average time per page: ${avgPageTime.toFixed(2)}s`);
			console.log(`Estimated time remaining: ${estimatedTimeRemaining.toFixed(2)}s (${(estimatedTimeRemaining/60).toFixed(2)} minutes)`);
			console.log('-----------------------------------');

			// Increment page counter
			startPage += PAGES_BATCH_SIZE;

			// Stop if we've reached the last page
			if (shouldStop) {
				hasMoreCards = false;
				console.log('All pages have been retrieved.');
			}

			// Small delay before continuing
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`Error processing pages ${startPage}-${startPage + PAGES_BATCH_SIZE - 1}:`, error);

			// Wait in case of error
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Continue with the next page
			startPage += 1;
		}
	}

	// Analyze retrieved cards by type
	const allCards = cardGroups.flat();
	const pokemonCards = allCards.filter(card => card.supertype === 'Pokémon').length;
	const energyCards = allCards.filter(card => card.supertype === 'Energy').length;
	const trainerCards = allCards.filter(card => card.supertype === 'Trainer').length;

	const totalTime = (Date.now() - startTime) / 1000;

	console.log('-----------------------------------');
	console.log(`Card retrieval summary:`);
	console.log(`- Pokémon: ${pokemonCards} cards`);
	console.log(`- Energy: ${energyCards} cards`);
	console.log(`- Trainer: ${trainerCards} cards`);
	console.log(`- Total: ${allCards.length}/${totalAvailable} cards (${((allCards.length/totalAvailable)*100).toFixed(2)}%)`);
	console.log(`Total execution time: ${totalTime.toFixed(2)}s (${(totalTime/60).toFixed(2)} minutes)`);
	console.log('-----------------------------------');

	await fs.writeFile(CARDS, JSON.stringify(allCards));
	console.log(`Finished writing all cards to ${CARDS}!`);

	// Function to process a page
	async function processPage(page: number) {
		const pageStartTime = Date.now();

		const params = {
			select: selectFields,
			pageSize: '250',
			page: page.toString()
		};

		console.log(`Retrieving page ${page}...`);
		const response = await fetchFromApi<FetchedCardsResponse & { totalCount: number }>('cards', params);

		if (!response.data || response.data.length === 0) {
			const pageTime = (Date.now() - pageStartTime) / 1000;
			return { cards: [], pageTime, isLastPage: true, totalCount: response.totalCount };
		}

		// Load sets data to check for merged sets
		let setMappings: Record<string, { primarySetName: string, primarySetCode: string }> = {};
		try {
			// Try to read existing sets data if available
			const setsData = await fs.readFile(SETS, 'utf-8')
				.then(data => JSON.parse(data))
				.catch(() => {
					console.log('Sets data not found, will be created during the sets scraper run');
					return [];
				});

			// Check if we already have sets data
			if (setsData.length > 0) {
				console.log(`Loaded ${setsData.length} sets for reference`);
				
				// Create a mapping of set names to their proper codes
				const setsByPtcgoCode: Record<string, Array<{name: string, setCode: string}>> = {};
				
				for (const set of setsData) {
					if (!set.ptcgoCode) continue;
					
					const setCode = set.logo.split('/').at(-2) || '';
					
					if (!setsByPtcgoCode[set.ptcgoCode]) {
						setsByPtcgoCode[set.ptcgoCode] = [];
					}
					
					setsByPtcgoCode[set.ptcgoCode].push({
						name: set.name,
						setCode
					});
				}
				
				// For each ptcgoCode with multiple sets, determine the primary set
				for (const [ptcgoCode, sets] of Object.entries(setsByPtcgoCode)) {
					if (sets.length > 1) {
						// Sort by set code length to get the shortest one
						sets.sort((a, b) => a.setCode.length - b.setCode.length);
						const primarySet = sets[0];
						
						// Create mappings for all non-primary sets to the primary one
						for (let i = 1; i < sets.length; i++) {
							const secondarySet = sets[i];
							setMappings[secondarySet.name] = {
								primarySetName: primarySet.name,
								primarySetCode: primarySet.setCode
							};
							console.log(`Mapping ${secondarySet.name} (${secondarySet.setCode}) to primary set ${primarySet.name} (${primarySet.setCode})`);
						}
					}
				}
			}
		} catch (error) {
			console.error('Error loading sets data for reference:', error);
		}

		// Process cards - without generating average color
		const processedCards = response.data.map((card: FetchedCard) => {
			const tcgplayerPrices = card?.tcgplayer?.prices ?? {};

			const price = card.cardmarket?.prices?.averageSellPrice || tcgplayerPrices.holofoil?.market ||
				tcgplayerPrices.reverseHolofoil?.market ||
				tcgplayerPrices.normal?.market || tcgplayerPrices["1stEditionHolofoil"]?.market ||
				tcgplayerPrices["1stEditionNormal"]?.market;

			const nationalPokedexNumbers = card.nationalPokedexNumbers ?? [];

			// Extract set code from image URL
			let setCode = card.images.large.split('/').at(-2);
			let setName = card.set.name;
			
			// Check if this card's set needs to be mapped to a primary set
			if (setMappings[setName]) {
				const mapping = setMappings[setName];
				setName = mapping.primarySetName;
				setCode = mapping.primarySetCode;
				
				// Note: We're keeping the original image URLs as requested
				// Don't modify card.images.large or card.images.small
			}

			// Extract card number from filename
			let cardNumber;
			const filename = card.images.large.split('/').at(-1);
			if (filename) {
				const match = filename.split('_')[0].match(/[a-z]*(\d+)[a-z]*/i);
				cardNumber = match ? match[1] : undefined;
			}

			// Generate unique card code
			const cardCode = generateUniqueCardCode(
				nationalPokedexNumbers.length > 0 ? nationalPokedexNumbers[0] : 0,
				setCode,
				cardNumber,
				card.supertype
			);

			const cardMarketUrl = card.cardmarket?.url;
			const tcgplayerUrl = card.tcgplayer?.url;

			const cardMarketUpdatedAt = card.cardmarket?.updatedAt;
			const tcgplayerUpdatedAt = card.tcgplayer?.updatedAt;

			return {
				artist: card.artist ?? 'Unknown',
				cardCode, // Add the generated cardCode
				cardMarketUpdatedAt: cardMarketUpdatedAt ?? tcgplayerUpdatedAt,
				cardMarketUrl: cardMarketUrl ?? tcgplayerUrl?.replace('/tcgplayer/', '/cardmarket/'),
				image: card.images.large,
				meanColor: "FFFFFF", // Default color instead of calculating average
				name: card.name,
				pokemonNumber: parseInt(nationalPokedexNumbers.length > 0 ? nationalPokedexNumbers.join(', ') : '-'),
				price,
				rarity: card.rarity ?? 'Unknown',
				setName: setName,
				supertype: card.supertype,
				types: card.types?.join(', ') || '',
			};
		});

		// Statistics by supertype
		const pokemonCount = processedCards.filter(card => card.supertype === 'Pokémon').length;
		const energyCount = processedCards.filter(card => card.supertype === 'Energy').length;
		const trainerCount = processedCards.filter(card => card.supertype === 'Trainer').length;

		const pageTime = (Date.now() - pageStartTime) / 1000;
		console.log(`Page ${page}: ${processedCards.length} cards (Pokémon: ${pokemonCount}, Energy: ${energyCount}, Trainer: ${trainerCount}) in ${pageTime.toFixed(2)}s`);

		return {
			cards: processedCards,
			pageTime,
			isLastPage: processedCards.length < 250,
			totalCount: response.totalCount
		};
	}
}

export async function fetchSets() {
	const sets = await fetchAndFilterSets();
	console.log(`Filtered sets, writing ${sets.length} sets!`);
	await fs.writeFile(SETS, JSON.stringify(sets));
	console.log(`Finished writing sets to ${SETS}`);
}

// Nouvelle fonction pour récupérer toutes les cartes d'un type spécifique (Energy ou Trainer)
export async function fetchCardsByType(supertype: string) {
	try {
		const selectFields = 'name,rarity,images,set,cardmarket,types,supertype,artist,tcgplayer';
		const query = `supertype:${supertype}`;

		let allCards: FetchedCard[] = [];
		let page = 1;
		let hasMoreCards = true;

		console.log(`Fetching all ${supertype} cards...`);

		while (hasMoreCards) {
			const params = {
				q: query,
				select: selectFields,
				pageSize: '250',
				page: page.toString()
			};

			const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

			if (response.data.length > 0) {
				allCards = [...allCards, ...response.data];
				console.log(`Retrieved page ${page} with ${response.data.length} ${supertype} cards. Total: ${allCards.length}`);
				page++;
			} else {
				hasMoreCards = false;
			}

			// Petit délai pour éviter de surcharger l'API
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		console.log(`Completed fetching ${supertype} cards. Total: ${allCards.length}`);
		return allCards;
	} catch (e) {
		console.error(`Error fetching ${supertype} cards: ${e instanceof Error ? e.message : e}`);
		// Attendre puis réessayer
		await new Promise(resolve => setTimeout(resolve, 2500));
		return fetchCardsByType(supertype);
	}
}
