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
		const setsWithCards = sets.filter(set => cards.some(card => card.setName === set.name));
		const uniqueNames = [...new Set(setsWithCards.map(set => set.name))];

		return uniqueNames.map(name => ({
			name,
			logo: sets.find(set => set.name === name)?.images?.logo,
			printedTotal: sets.find(set => set.name === name)?.printedTotal,
			ptcgoCode: sets.find(set => set.name === name)?.ptcgoCode,
			releaseDate: sets.find(set => set.name === name)?.releaseDate,
		}));
	} catch (error) {
		console.error(`Error reading ${CARDS}`, error);
		return setsData;
	}
}

export async function fetchCards() {
	const cardGroups = [];

	// Récupérer toutes les cartes sans filtrer par supertype
	console.log('Récupération de toutes les cartes...');

	let startPage = 1;
	let hasMoreCards = true;
	let totalCards = 0;
	let totalAvailable = 0;

	// Statistiques de temps
	const startTime = Date.now();
	const pageProcessingTimes: number[] = [];

	// Nombre de pages à traiter en parallèle
	const PAGES_BATCH_SIZE = 10;

	const selectFields = 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers,supertype,artist,tcgplayer';

	while (hasMoreCards) {
		try {
			// Traiter plusieurs pages en parallèle
			const pageBatchPromises = [];

			for (let i = 0; i < PAGES_BATCH_SIZE; i++) {
				const currentPage = startPage + i;
				pageBatchPromises.push(processPage(currentPage));
			}

			const results = await Promise.allSettled(pageBatchPromises);

			// Vérifier si on a atteint la fin des pages
			const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{
				cards: any[];
				pageTime: number;
				isLastPage: boolean;
				totalCount?: number;
			}>[];

			if (successfulResults.length === 0) {
				console.log('Aucune page traitée avec succès, on arrête.');
				hasMoreCards = false;
				continue;
			}

			// Mettre à jour les statistiques et les cartes
			let shouldStop = false;

			for (const result of successfulResults) {
				if (result.value.cards.length > 0) {
					cardGroups.push(result.value.cards);
					totalCards += result.value.cards.length;
					pageProcessingTimes.push(result.value.pageTime);

					// Mettre à jour le total disponible si on ne l'a pas encore
					if (totalAvailable === 0 && result.value.totalCount) {
						totalAvailable = result.value.totalCount;
						console.log(`Total de cartes disponibles dans l'API: ${totalAvailable}`);
					}
				}

				if (result.value.isLastPage) {
					shouldStop = true;
				}
			}

			// Calcul des statistiques de temps
			const elapsedTime = (Date.now() - startTime) / 1000; // en secondes
			const avgPageTime = pageProcessingTimes.reduce((sum, time) => sum + time, 0) / pageProcessingTimes.length;
			const pagesRemaining = Math.ceil((totalAvailable - totalCards) / 250);
			const estimatedTimeRemaining = pagesRemaining * avgPageTime;

			console.log(`Progression: ${totalCards}/${totalAvailable} cartes (${((totalCards/totalAvailable)*100).toFixed(2)}%)`);
			console.log(`Temps écoulé: ${elapsedTime.toFixed(2)}s, Temps moyen par page: ${avgPageTime.toFixed(2)}s`);
			console.log(`Estimation du temps restant: ${estimatedTimeRemaining.toFixed(2)}s (${(estimatedTimeRemaining/60).toFixed(2)} minutes)`);
			console.log('-----------------------------------');

			// Incrémenter le compteur de pages
			startPage += PAGES_BATCH_SIZE;

			// Arrêter si on a atteint la dernière page
			if (shouldStop) {
				hasMoreCards = false;
				console.log('Toutes les pages ont été récupérées.');
			}

			// Petit délai avant de poursuivre
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`Erreur lors du traitement des pages ${startPage}-${startPage + PAGES_BATCH_SIZE - 1}:`, error);

			// Attendre en cas d'erreur
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Continuer avec la page suivante
			startPage += 1;
		}
	}

	// Analyse des cartes récupérées par type
	const allCards = cardGroups.flat();
	const pokemonCards = allCards.filter(card => card.supertype === 'Pokémon').length;
	const energyCards = allCards.filter(card => card.supertype === 'Energy').length;
	const trainerCards = allCards.filter(card => card.supertype === 'Trainer').length;

	const totalTime = (Date.now() - startTime) / 1000;

	console.log('-----------------------------------');
	console.log(`Récapitulatif des cartes récupérées :`);
	console.log(`- Pokémon: ${pokemonCards} cartes`);
	console.log(`- Energy: ${energyCards} cartes`);
	console.log(`- Trainer: ${trainerCards} cartes`);
	console.log(`- Total: ${allCards.length}/${totalAvailable} cartes (${((allCards.length/totalAvailable)*100).toFixed(2)}%)`);
	console.log(`Temps total d'exécution: ${totalTime.toFixed(2)}s (${(totalTime/60).toFixed(2)} minutes)`);
	console.log('-----------------------------------');

	await fs.writeFile(CARDS, JSON.stringify(allCards));
	console.log(`Écriture de toutes les cartes dans ${CARDS} terminée !`);

	// Fonction pour traiter une page
	async function processPage(page: number) {
		const pageStartTime = Date.now();

		const params = {
			select: selectFields,
			pageSize: '250',
			page: page.toString()
		};

		console.log(`Récupération de la page ${page}...`);
		const response = await fetchFromApi<FetchedCardsResponse & { totalCount: number }>('cards', params);

		if (!response.data || response.data.length === 0) {
			const pageTime = (Date.now() - pageStartTime) / 1000;
			return { cards: [], pageTime, isLastPage: true, totalCount: response.totalCount };
		}

		// Traitement des cartes - sans générer la couleur moyenne
		const processedCards = response.data.map((card: FetchedCard) => {
			const tcgplayerPrices = card?.tcgplayer?.prices ?? {};

			const price = card.cardmarket?.prices?.averageSellPrice || tcgplayerPrices.holofoil?.market ||
				tcgplayerPrices.reverseHolofoil?.market ||
				tcgplayerPrices.normal?.market || tcgplayerPrices["1stEditionHolofoil"]?.market ||
				tcgplayerPrices["1stEditionNormal"]?.market;

			const nationalPokedexNumbers = card.nationalPokedexNumbers ?? [];

			// Extract set code from image URL
			const setCode = card.images.large.split('/').at(-2);

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
				meanColor: "FFFFFF", // Couleur par défaut au lieu de calculer la moyenne
				name: card.name,
				pokemonNumber: parseInt(nationalPokedexNumbers.length > 0 ? nationalPokedexNumbers.join(', ') : '-'),
				price,
				rarity: card.rarity ?? 'Unknown',
				setName: card.set.name,
				supertype: card.supertype,
				types: card.types?.join(', ') || '',
			};
		});

		// Statistiques par supertype
		const pokemonCount = processedCards.filter(card => card.supertype === 'Pokémon').length;
		const energyCount = processedCards.filter(card => card.supertype === 'Energy').length;
		const trainerCount = processedCards.filter(card => card.supertype === 'Trainer').length;

		const pageTime = (Date.now() - pageStartTime) / 1000;
		console.log(`Page ${page}: ${processedCards.length} cartes (Pokémon: ${pokemonCount}, Energy: ${energyCount}, Trainer: ${trainerCount}) en ${pageTime.toFixed(2)}s`);

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
