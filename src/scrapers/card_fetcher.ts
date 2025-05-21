import * as fs from 'node:fs/promises';
import { POKEMONS_COUNT } from '~/constants';
import { CARDS, POKEMONS, PRICES, SETS } from './files';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';
import { fetchFromApi } from './api_utils';
import type { Pokemon, PriceData } from '$lib/types';
import type { FetchedCard, FetchedCardsResponse, ProcessedCard, SetMappings } from './tcg_api_types';

const SELECT_FIELDS = "name,rarity,images,number,set,types,nationalPokedexNumbers,supertype,artist,cardmarket,tcgplayer";

/**
 * Fetches cards for a specific Pokémon by name and Pokédex index.
 * Retries with name if index search fails.
 */
export async function fetchPokemon(name: string, index: number): Promise<FetchedCard[]> {
	try {
		let query = `nationalPokedexNumbers:${index}`;
		let params = {
			q: query,
			orderBy: 'nationalPokedexNumbers',
			select: SELECT_FIELDS,
			pageSize: '250',
		};

		const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

		if (!response.data.length) {
			const searchName = name.replaceAll('-', ' ');
			console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), no cards found for index, retrying with name '${searchName}'...`);

			params = {
				q: `name:"${searchName}"`,
				orderBy: 'nationalPokedexNumbers', // Keep order for consistency? Maybe remove?
				select: SELECT_FIELDS,
				pageSize: '250',
			};

			return (await fetchFromApi<FetchedCardsResponse>('cards', params)).data;
		}

		return response.data;
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${errorMessage}, retrying...`);
		const delay = errorMessage.includes('429') ? 2500 : 1500;
		await new Promise(resolve => setTimeout(resolve, delay));
		return fetchPokemon(name, index);
	}
}

/**
 * Fetches all cards from the API, handling pagination and parallel processing.
 * Saves the results to the CARDS file and prices to the PRICES file.
 */
export async function fetchAndSaveAllCards() {
	const allCards: ProcessedCard[] = [];
	const allPrices: Record<string, PriceData> = {};
	console.log('Retrieving all cards and prices...');

	let startPage = 1;
	let hasMoreCards = true;
	let totalCardsRetrieved = 0;
	let totalCardsAvailable = 0;

	const startTime = Date.now();
	const pageProcessingTimes: number[] = [];
	const PAGES_BATCH_SIZE = 10;

	const pokemons = await fs.readFile(POKEMONS, 'utf-8')
		.then(data => JSON.parse(data))
		.catch(() => {
			console.log('Pokemons data not found or empty, cannot create set mappings.');
			return [];
		});

	// Load set mappings for merging sets during card processing
	const setMappings = await loadSetMappings();

	while (hasMoreCards) {
		try {
			const pageBatchPromises = [];
			for (let i = 0; i < PAGES_BATCH_SIZE; i++) {
				const currentPage = startPage + i;
				pageBatchPromises.push(processPage(currentPage, setMappings, pokemons));
			}

			const results = await Promise.allSettled(pageBatchPromises);
			const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{
				cards: ProcessedCard[];
				prices: Record<string, PriceData>;
				pageTime: number;
				isLastPage: boolean;
				totalCount?: number;
			}>[];

			if (successfulResults.length === 0 && results.some(r => r.status === 'rejected')) {
				console.log('All pages in batch failed, stopping.');
				hasMoreCards = false;
				continue;
			}

			let shouldStop = false;
			for (const result of successfulResults) {
				const { cards, prices, pageTime, isLastPage, totalCount } = result.value;
				if (cards.length > 0) {
					allCards.push(...cards);
					Object.assign(allPrices, prices);
					totalCardsRetrieved += cards.length;
					pageProcessingTimes.push(pageTime);

					if (totalCardsAvailable === 0 && totalCount) {
						totalCardsAvailable = totalCount;
						console.log(`Total cards available in API: ${totalCardsAvailable}`);
					}
				}
				if (isLastPage) {
					shouldStop = true;
				}
			}

			logProgress(startTime, pageProcessingTimes, totalCardsRetrieved, totalCardsAvailable);

			startPage += PAGES_BATCH_SIZE;
			if (shouldStop) {
				hasMoreCards = false;
				console.log('All pages have been retrieved.');
			}

			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`Error processing pages ${startPage}-${startPage + PAGES_BATCH_SIZE - 1}:`, error);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}

	logFinalSummary(startTime, allCards, totalCardsAvailable);

	await Promise.all([
		fs.writeFile(CARDS, JSON.stringify(allCards)),
		fs.writeFile(PRICES, JSON.stringify(allPrices))
	]);
	console.log(`Finished writing ${allCards.length} cards to ${CARDS}!`);
	console.log(`Finished writing prices for ${Object.keys(allPrices).length} cards to ${PRICES}!`);
}

/**
 * Fetches all cards from the API, handling pagination and parallel processing.
 * Returns the results as an object containing all cards and prices.
 */
export async function fetchAllCardsData(): Promise<{ allCards: ProcessedCard[], allPrices: Record<string, PriceData> }> {
	const allCards: ProcessedCard[] = [];
	const allPrices: Record<string, PriceData> = {};
	console.log('Retrieving all cards and prices for data return...');

	let startPage = 1;
	let hasMoreCards = true;
	let totalCardsRetrieved = 0;
	let totalCardsAvailable = 0;

	const startTime = Date.now();
	const pageProcessingTimes: number[] = [];
	const PAGES_BATCH_SIZE = 10; // Consider making this configurable or smaller for serverless

	// TODO: Adapt Pokemon and SetMappings loading for serverless environment if these files are large or not bundled.
	// For now, assuming these might be fetched from R2 or passed as arguments if small.
	// If these are not available, parts of card processing (e.g., set merging, some Pokémon ID lookups) might be affected.
	let pokemons: Pokemon[] = [];
	try {
		// This will likely fail in a strict serverless environment without fs access.
		// pokemons = await fs.readFile(POKEMONS, 'utf-8').then(data => JSON.parse(data));
		console.warn('Pokemon data loading from fs might not work in serverless. Ensure data is available via another method if needed.');
	} catch (e) {
		console.log('Pokemons data not found or empty, card processing might be affected.');
	}

	let setMappings: SetMappings = {};
	try {
		// This will also likely fail in a strict serverless environment.
		// setMappings = await loadSetMappings(); // loadSetMappings also uses fs.readFile
		console.warn('Set mappings loading from fs might not work in serverless. Ensure data is available via another method if needed.');
	} catch(e) {
		console.log('Set mappings not loaded, card processing might be affected.');
	}

	while (hasMoreCards) {
		try {
			const pageBatchPromises = [];
			for (let i = 0; i < PAGES_BATCH_SIZE; i++) {
				const currentPage = startPage + i;
				pageBatchPromises.push(processPage(currentPage, setMappings, pokemons));
			}

			const results = await Promise.allSettled(pageBatchPromises);
			const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{
				cards: ProcessedCard[];
				prices: Record<string, PriceData>;
				pageTime: number;
				isLastPage: boolean;
				totalCount?: number;
			}>[];

			if (successfulResults.length === 0 && results.some(r => r.status === 'rejected')) {
				console.log('All pages in batch failed, stopping.');
				hasMoreCards = false;
				continue;
			}

			let shouldStop = false;
			for (const result of successfulResults) {
				const { cards, prices, pageTime, isLastPage, totalCount } = result.value;
				if (cards.length > 0) {
					allCards.push(...cards);
					Object.assign(allPrices, prices);
					totalCardsRetrieved += cards.length;
					pageProcessingTimes.push(pageTime);

					if (totalCardsAvailable === 0 && totalCount) {
						totalCardsAvailable = totalCount;
						console.log(`Total cards available in API: ${totalCardsAvailable}`);
					}
				}
				if (isLastPage) {
					shouldStop = true;
				}
			}

			logProgress(startTime, pageProcessingTimes, totalCardsRetrieved, totalCardsAvailable);

			startPage += PAGES_BATCH_SIZE;
			if (shouldStop) {
				hasMoreCards = false;
				console.log('All pages have been retrieved.');
			}

			await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
		} catch (error) {
			console.error(`Error processing pages ${startPage}-${startPage + PAGES_BATCH_SIZE - 1}:`, error);
			await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay on error
		}
	}

	logFinalSummary(startTime, allCards, totalCardsAvailable);

	console.log(`Finished fetching ${allCards.length} cards and prices for ${Object.keys(allPrices).length} cards.`);
	return { allCards, allPrices };
}

/**
 * Helper function to process a single page of cards.
 * Returns processed cards and their associated prices.
 */
async function processPage(page: number, setMappings: SetMappings, pokemons: Pokemon[]) {
	const pageStartTime = Date.now();
	console.log(`Retrieving page ${page}...`);

	const params = {
		select: SELECT_FIELDS,
		pageSize: '250',
		page: page.toString()
	};

	const response = await fetchFromApi<FetchedCardsResponse>('cards', params);
	const fetchedCardsRaw = response.data ?? [];

	if (fetchedCardsRaw.length === 0) {
		const pageTime = (Date.now() - pageStartTime) / 1000;
		return { cards: [], prices: {}, pageTime, isLastPage: true, totalCount: response.totalCount };
	}

	const processedCards: ProcessedCard[] = [];
	const pricesForPage: Record<string, PriceData> = {};

	for (const rawCard of fetchedCardsRaw) {
		const card = mapFetchedCardToProcessed(rawCard, setMappings, pokemons);
		processedCards.push(card);

		const cardmarket = rawCard.cardmarket;
		const tcgplayer = rawCard.tcgplayer;
        const cardPrices = {
            simple: cardmarket?.prices?.suggestedPrice || cardmarket?.prices?.averageSellPrice || tcgplayer?.prices?.normal?.market,
            low: cardmarket?.prices?.lowPrice || tcgplayer?.prices?.normal?.low,
            trend: cardmarket?.prices?.trendPrice || tcgplayer?.prices?.normal?.market,
            avg1: cardmarket?.prices?.avg1,
            avg7: cardmarket?.prices?.avg7,
            avg30: cardmarket?.prices?.avg30,
            reverseSimple: cardmarket?.prices?.reverseHoloSell ?? tcgplayer?.prices?.reverseHolofoil?.market,
            reverseLow: cardmarket?.prices?.reverseHoloLow ?? tcgplayer?.prices?.reverseHolofoil?.low,
            reverseTrend: cardmarket?.prices?.reverseHoloTrend ?? tcgplayer?.prices?.reverseHolofoil?.market,
            reverseAvg1: cardmarket?.prices?.reverseHoloAvg1,
            reverseAvg7: cardmarket?.prices?.reverseHoloAvg7,
            reverseAvg30: cardmarket?.prices?.reverseHoloAvg30
        };

        // Remove undefined prices
        Object.keys(cardPrices).forEach(key => {
            const price = cardPrices[key as keyof PriceData];
            if (price === undefined || price === null) {
                delete cardPrices[key as keyof PriceData];
            }
        });

        pricesForPage[card.cardCode] = cardPrices;
	}

	const pokemonCount = processedCards.filter(card => card.supertype === 'Pokémon').length;
	const energyCount = processedCards.filter(card => card.supertype === 'Energy').length;
	const trainerCount = processedCards.filter(card => card.supertype === 'Trainer').length;
	const pageTime = (Date.now() - pageStartTime) / 1000;
	console.log(`Page ${page}: ${processedCards.length} cards (Pokémon: ${pokemonCount}, Energy: ${energyCount}, Trainer: ${trainerCount}) in ${pageTime.toFixed(2)}s`);

	return {
		cards: processedCards,
		prices: pricesForPage,
		pageTime,
		isLastPage: processedCards.length < 250,
		totalCount: response.totalCount
	};
}

/**
 * Loads set mappings from the SETS file to handle merged sets.
 */
async function loadSetMappings(): Promise<SetMappings> {
	let setMappings: SetMappings = {};
	try {
		const setsData = await fs.readFile(SETS, 'utf-8')
			.then(data => JSON.parse(data))
			.catch(() => {
				console.log('Sets data not found or empty, cannot create set mappings.');
				return [];
			});

		if (setsData.length > 0) {
			const setsByPtcgoCode: Record<string, Array<{ name: string, setCode: string }>> = {};
			for (const set of setsData) {
				if (!set.ptcgoCode || !set.logo) continue;
				const setCode = set.ptcgoCode;
				if (!setCode) continue;

				setsByPtcgoCode[set.ptcgoCode] ??= [];
				setsByPtcgoCode[set.ptcgoCode].push({ name: set.name, setCode });
			}

			for (const sets of Object.values(setsByPtcgoCode)) {
				if (sets.length > 1) {
					sets.sort((a, b) => a.setCode.length - b.setCode.length);
					const primarySet = sets[0];
					for (let i = 1; i < sets.length; i++) {
						const secondarySet = sets[i];
						setMappings[secondarySet.name] = {
							primarySetName: primarySet.name,
							primarySetCode: primarySet.setCode
						};
						console.log(`Mapping ${secondarySet.name} (${secondarySet.setCode}) -> ${primarySet.name} (${primarySet.setCode})`);
					}
				}
			}
			console.log(`Loaded ${Object.keys(setMappings).length} set mappings.`);
		}
	} catch (error) {
		console.error('Error loading or processing sets data for mappings:', error);
	}
	return setMappings;
}

/**
 * Maps a raw FetchedCard from the API to our ProcessedCard structure.
 */
function mapFetchedCardToProcessed(card: FetchedCard, setMappings: SetMappings, pokemons: Pokemon[]): ProcessedCard {
	const nationalPokedexNumbers = card.nationalPokedexNumbers ?? [];
	let originalSetName = card.set.name;
	let urlCode = card.images.large.split('/').at(-2) || setMappings[originalSetName]?.primarySetCode || '';

	const cardMarketUrl = card.cardmarket?.url;
	const tcgplayerUrl = card.tcgplayer?.url;
	const cardMarketUpdatedAt = card.cardmarket?.updatedAt;
	const tcgplayerUpdatedAt = card.tcgplayer?.updatedAt;

	let nationalPokedexNumber = nationalPokedexNumbers.at(0);

	if (card.supertype === 'Pokémon' && !nationalPokedexNumber) {
		console.log(`Trying to find Pokémon for '${card.name}'...`);
		const foundPokemon = pokemons.find(p => {
			const pokemonName = p.name.toLowerCase().replaceAll('-', ' ');
			const cardName = card.name.toLowerCase().replaceAll('-', ' ');
			return cardName.includes(pokemonName) || pokemonName.includes(cardName);
		});
		nationalPokedexNumber = foundPokemon?.id;
		if (!nationalPokedexNumber) {
			console.log(`No Pokémon found for '${card.name}'`);
		} else {
			console.log(`Found Pokémon '${foundPokemon?.name}' number ${nationalPokedexNumber} for '${card.name}'`);
		}

		// If pokemon name is "Buried Fossil" swap supertype to "Trainer"
		if (card.name.toLowerCase().includes('buried fossil')) {
			card.supertype = 'Trainer';
		}

		// If nationalPokedexNumber is undefined and supertype is Pokémon, set to 99999
		if (nationalPokedexNumber === undefined && card.supertype === 'Pokémon') {
			nationalPokedexNumber = 99999;
		}

	}

	const cardCode = generateUniqueCardCode(nationalPokedexNumber ?? 0, urlCode, card.number, card.supertype);

	return {
		artist: card.artist ?? 'Unknown',
		cardCode,
		cardMarketUpdatedAt: cardMarketUpdatedAt ?? tcgplayerUpdatedAt,
		cardMarketUrl: cardMarketUrl ?? tcgplayerUrl?.replace('/tcgplayer/', '/cardmarket/'),
		image: card.images.large,
		meanColor: 'FFFFFF',
		name: card.name,
		pokemonNumber: nationalPokedexNumber,
		rarity: card.rarity ?? 'Common',
		setName: originalSetName,
		supertype: card.supertype,
		types: card.types?.join(', ') || '',
	};
}

/**
 * Logs progress during card fetching.
 */
function logProgress(startTime: number, pageProcessingTimes: number[], totalCardsRetrieved: number, totalCardsAvailable: number) {
	if (totalCardsAvailable === 0 || pageProcessingTimes.length === 0) return;

	const elapsedTime = (Date.now() - startTime) / 1000;
	const avgPageTime = pageProcessingTimes.reduce((sum, time) => sum + time, 0) / pageProcessingTimes.length;
	const pagesRemaining = Math.ceil(Math.max(0, totalCardsAvailable - totalCardsRetrieved) / 250);
	const estimatedTimeRemaining = pagesRemaining * avgPageTime;

	console.log(`Progress: ${totalCardsRetrieved}/${totalCardsAvailable} cards (${((totalCardsRetrieved / totalCardsAvailable) * 100).toFixed(2)}%)`);
	console.log(`Elapsed time: ${elapsedTime.toFixed(2)}s, Avg page time: ${avgPageTime.toFixed(2)}s`);
	console.log(`Est. time remaining: ${estimatedTimeRemaining.toFixed(2)}s (${(estimatedTimeRemaining / 60).toFixed(2)} mins)`);
	console.log('-----------------------------------');
}

/**
 * Logs the final summary after card fetching is complete.
 */
function logFinalSummary(startTime: number, allCards: ProcessedCard[], totalCardsAvailable: number) {
	const pokemonCards = allCards.filter(card => card.supertype === 'Pokémon').length;
	const energyCards = allCards.filter(card => card.supertype === 'Energy').length;
	const trainerCards = allCards.filter(card => card.supertype === 'Trainer').length;
	const totalTime = (Date.now() - startTime) / 1000;

	console.log('-----------------------------------');
	console.log(`Card retrieval summary:`);
	console.log(`- Pokémon: ${pokemonCards} cards`);
	console.log(`- Energy: ${energyCards} cards`);
	console.log(`- Trainer: ${trainerCards} cards`);
	const percentageRetrieved = totalCardsAvailable > 0 ? ((allCards.length / totalCardsAvailable) * 100).toFixed(2) : 'N/A';
	console.log(`- Total: ${allCards.length}${totalCardsAvailable > 0 ? `/${totalCardsAvailable}` : ''} cards (${percentageRetrieved}%)`);
	console.log(`Total execution time: ${totalTime.toFixed(2)}s (${(totalTime / 60).toFixed(2)} minutes)`);
	console.log('-----------------------------------');
}

/**
 * Fetches all cards of a specific supertype (Energy or Trainer).
 */
export async function fetchCardsByType(supertype: 'Energy' | 'Trainer'): Promise<FetchedCard[]> {
	try {
		const query = `supertype:${supertype}`;
		let allCards: FetchedCard[] = [];
		let page = 1;
		let hasMoreCards = true;

		console.log(`Fetching all ${supertype} cards...`);

		while (hasMoreCards) {
			const params = {
				q: query,
				select: SELECT_FIELDS,
				pageSize: '250',
				page: page.toString()
			};

			const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

			if (response.data && response.data.length > 0) {
				allCards = [...allCards, ...response.data];
				console.log(`Retrieved page ${page} with ${response.data.length} ${supertype} cards. Total: ${allCards.length}`);
				page++;
			} else {
				hasMoreCards = false;
			}
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		console.log(`Completed fetching ${supertype} cards. Total: ${allCards.length}`);
		return allCards;
	} catch (e) {
		console.error(`Error fetching ${supertype} cards: ${e instanceof Error ? e.message : e}, retrying...`);
		await new Promise(resolve => setTimeout(resolve, 2500));
		return fetchCardsByType(supertype);
	}
}
