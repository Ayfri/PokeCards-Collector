import * as fs from 'node:fs/promises';
import { POKEMONS_COUNT } from '~/constants';
import { CARDS, SETS } from './files';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';
import { fetchFromApi } from './api_utils';
import type { FetchedCard, FetchedCardsResponse, ProcessedCard, SetMappings } from './tcg_api_types';

const SELECT_FIELDS = 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers,supertype,artist,tcgplayer';

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
 * Saves the results to the CARDS file.
 */
export async function fetchAndSaveAllCards() {
	const cardGroups: ProcessedCard[][] = [];
	console.log('Retrieving all cards...');

	let startPage = 1;
	let hasMoreCards = true;
	let totalCardsRetrieved = 0;
	let totalCardsAvailable = 0;

	const startTime = Date.now();
	const pageProcessingTimes: number[] = [];
	const PAGES_BATCH_SIZE = 10;

	// Load set mappings for merging sets during card processing
	const setMappings = await loadSetMappings();

	while (hasMoreCards) {
		try {
			const pageBatchPromises = [];
			for (let i = 0; i < PAGES_BATCH_SIZE; i++) {
				const currentPage = startPage + i;
				pageBatchPromises.push(processPage(currentPage, setMappings));
			}

			const results = await Promise.allSettled(pageBatchPromises);
			const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{
				cards: ProcessedCard[];
				pageTime: number;
				isLastPage: boolean;
				totalCount?: number;
			}>[];

			if (successfulResults.length === 0 && results.some(r => r.status === 'rejected')) {
				console.log('All pages in batch failed, stopping.');
				hasMoreCards = false; // Or implement retry for the batch
				continue;
			}

			let shouldStop = false;
			for (const result of successfulResults) {
				const { cards, pageTime, isLastPage, totalCount } = result.value;
				if (cards.length > 0) {
					cardGroups.push(cards);
					totalCardsRetrieved += cards.length;
					pageProcessingTimes.push(pageTime);

					if (totalCardsAvailable === 0 && totalCount) {
						totalCardsAvailable = totalCount;
						console.log(`Total cards available in API: ${totalCardsAvailable}`);
					}
				}
				if (isLastPage) {
					shouldStop = true; // Found the last page in this batch
				}
			}

			// Log progress
			logProgress(startTime, pageProcessingTimes, totalCardsRetrieved, totalCardsAvailable);

			startPage += PAGES_BATCH_SIZE;
			if (shouldStop) {
				hasMoreCards = false;
				console.log('All pages have been retrieved.');
			}

			await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between batches
		} catch (error) {
			console.error(`Error processing pages ${startPage}-${startPage + PAGES_BATCH_SIZE - 1}:`, error);
			await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer on error
			startPage += 1; // Consider retrying the failed batch instead of skipping
		}
	}

	// Final summary and save
	const allCards = cardGroups.flat();
	logFinalSummary(startTime, allCards, totalCardsAvailable);

	await fs.writeFile(CARDS, JSON.stringify(allCards));
	console.log(`Finished writing ${allCards.length} cards to ${CARDS}!`);
}

/**
 * Helper function to process a single page of cards.
 */
async function processPage(page: number, setMappings: SetMappings) {
	const pageStartTime = Date.now();
	console.log(`Retrieving page ${page}...`);

	const params = {
		select: SELECT_FIELDS,
		pageSize: '250',
		page: page.toString()
	};

	const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

	if (!response.data || response.data.length === 0) {
		const pageTime = (Date.now() - pageStartTime) / 1000;
		return { cards: [], pageTime, isLastPage: true, totalCount: response.totalCount };
	}

	const processedCards = response.data.map((card: FetchedCard) => mapFetchedCardToProcessed(card, setMappings));

	// Log stats for the page
	const pokemonCount = processedCards.filter(card => card.supertype === 'Pokémon').length;
	const energyCount = processedCards.filter(card => card.supertype === 'Energy').length;
	const trainerCount = processedCards.filter(card => card.supertype === 'Trainer').length;
	const pageTime = (Date.now() - pageStartTime) / 1000;
	console.log(`Page ${page}: ${processedCards.length} cards (Pokémon: ${pokemonCount}, Energy: ${energyCount}, Trainer: ${trainerCount}) in ${pageTime.toFixed(2)}s`);

	return {
		cards: processedCards,
		pageTime,
		isLastPage: processedCards.length < 250, // API returns less than page size on the last page
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
				const setCode = set.logo.split('/').at(-2) || '';
				if (!setCode) continue;

				if (!setsByPtcgoCode[set.ptcgoCode]) {
					setsByPtcgoCode[set.ptcgoCode] = [];
				}
				setsByPtcgoCode[set.ptcgoCode].push({ name: set.name, setCode });
			}

			for (const sets of Object.values(setsByPtcgoCode)) {
				if (sets.length > 1) {
					sets.sort((a, b) => a.setCode.length - b.setCode.length); // Shortest code is primary
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
function mapFetchedCardToProcessed(card: FetchedCard, setMappings: SetMappings): ProcessedCard {
	const tcgplayerPrices = card?.tcgplayer?.prices ?? {};
	const price = card.cardmarket?.prices?.averageSellPrice
		|| tcgplayerPrices.holofoil?.market
		|| tcgplayerPrices.reverseHolofoil?.market
		|| tcgplayerPrices.normal?.market
		|| tcgplayerPrices['1stEditionHolofoil']?.market
		|| tcgplayerPrices['1stEditionNormal']?.market;

	const nationalPokedexNumbers = card.nationalPokedexNumbers ?? [];
	let originalSetName = card.set.name;
	let setName = originalSetName;
	let setCode = card.images.large.split('/').at(-2) || ''; // Default set code from image

	// Apply set mapping if this set name is mapped to a primary set
	if (setMappings[originalSetName]) {
		const mapping = setMappings[originalSetName];
		setName = mapping.primarySetName; // Use primary set name
		setCode = mapping.primarySetCode; // Use primary set code
	}

	// Extract card number from filename (e.g., 'swsh9_en_001.png' -> '001')
	let cardNumber: string | undefined;
	const filename = card.images.large.split('/').at(-1);
	if (filename) {
		// Improved regex to handle variations like 'g1_en_rc1', 'sma_en_sv1', etc.
		const match = filename.match(/^([a-zA-Z]+[-a-zA-Z0-9]*)?(\d+)([a-zA-Z]*)(?:_.*)?\.png$/i);
		cardNumber = match ? match[2] : undefined; // Group 2 should be the number
	}

	// Generate unique card code
	const cardCode = generateUniqueCardCode(
		nationalPokedexNumbers.length > 0 ? nationalPokedexNumbers[0] : 0,
		setCode, // Use the potentially remapped setCode
		cardNumber,
		card.supertype
	);

	const cardMarketUrl = card.cardmarket?.url;
	const tcgplayerUrl = card.tcgplayer?.url;
	const cardMarketUpdatedAt = card.cardmarket?.updatedAt;
	const tcgplayerUpdatedAt = card.tcgplayer?.updatedAt;

	return {
		artist: card.artist ?? 'Unknown',
		cardCode,
		cardMarketUpdatedAt: cardMarketUpdatedAt ?? tcgplayerUpdatedAt,
		cardMarketUrl: cardMarketUrl ?? tcgplayerUrl?.replace('/tcgplayer/', '/cardmarket/'), // Derive market URL if missing
		image: card.images.large,
		meanColor: 'FFFFFF', // Placeholder - average color calculation removed
		name: card.name,
		pokemonNumber: nationalPokedexNumbers.length > 0 ? nationalPokedexNumbers[0] : 0, // Use first number or 0
		price: price ?? 0, // Default to 0 if no price found
		rarity: card.rarity ?? 'Common', // Default rarity
		setName: setName, // Use potentially remapped set name
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
				select: SELECT_FIELDS, // Use same select fields
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
			// Avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		console.log(`Completed fetching ${supertype} cards. Total: ${allCards.length}`);
		return allCards;
	} catch (e) {
		console.error(`Error fetching ${supertype} cards: ${e instanceof Error ? e.message : e}, retrying...`);
		await new Promise(resolve => setTimeout(resolve, 2500));
		return fetchCardsByType(supertype); // Recursive retry
	}
} 