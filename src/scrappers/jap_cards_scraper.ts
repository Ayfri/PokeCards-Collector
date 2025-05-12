import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { readFileSync } from 'fs';

const CARD_BASE_URL = 'https://www.tcgcollector.com';
const BASE_URL = `${CARD_BASE_URL}/cards/jp`;
const HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};
const WORKERS = 12; // Number of workers for parallelization
const DEBUG_MODE = false; // Set to true to scrape only one page

// Load Pokémon data
let pokemonsData: any[] = [];
let pokemonNameToNumber: Record<string, number> = {};
let pokemonNamesSet: Set<string> = new Set();
let pokemonNamesList: string[] = [];
try {
	const pokemonsRawData = readFileSync(path.join('src/assets', 'pokemons-full.json'), 'utf8');
	pokemonsData = JSON.parse(pokemonsRawData);
	pokemonNameToNumber = {};
	pokemonNamesSet = new Set();
	pokemonNamesList = [];
	pokemonsData.forEach(pokemon => {
		const name = pokemon.name.toLowerCase();
		pokemonNameToNumber[name] = pokemon.id;
		pokemonNamesSet.add(name);
		pokemonNamesList.push(name);
	});
	pokemonNamesList.sort((a, b) => b.length - a.length);
	console.log(`Loaded ${pokemonsData.length} Pokémon entries for mapping.`);
} catch (error) {
	console.error('Error loading pokemons-full.json:', error);
	process.exit(1);
}

function fixEncoding(text: string): string {
	if (!text) return '';
	return text
		.replace(/PokÃ©mon/g, 'Pokémon')
		.replace(/Ã©/g, 'é')
		.replace(/Ã¨/g, 'è')
		.replace(/Ã /g, 'à')
		.replace(/Ã¢/g, 'â')
		.replace(/Ãª/g, 'ê')
		.replace(/Ã®/g, 'î')
		.replace(/Ã´/g, 'ô')
		.replace(/Ã»/g, 'û');
}

function findPokemonInCardName(cardName: string): string | null {
	if (!cardName) return null;
	const lowerCardName = cardName.toLowerCase();
	if (pokemonNamesSet.has(lowerCardName)) return lowerCardName;
	if (lowerCardName.includes("'s ")) {
		const afterPossessive = lowerCardName.split("'s ")[1]?.trim();
		if (afterPossessive && pokemonNamesSet.has(afterPossessive)) return afterPossessive;
	}
    // Some cards have a common prefix that makes the pokemon name not found, we remove it
	const commonPrefixes = ['dark ', 'light ', 'shiny ', 'shadow ', "rocket's ", "team rocket's "];
	for (const prefix of commonPrefixes) {
		if (lowerCardName.startsWith(prefix)) {
			const withoutPrefix = lowerCardName.substring(prefix.length);
			if (pokemonNamesSet.has(withoutPrefix)) return withoutPrefix;
		}
	}
	const suffixRegex = /-[a-z]+$/i;
	if (suffixRegex.test(lowerCardName)) {
		const withoutSuffix = lowerCardName.replace(suffixRegex, '').trim();
		if (pokemonNamesSet.has(withoutSuffix)) return withoutSuffix;
	}
	for (const pokemonName of pokemonNamesList) {
		const regex = new RegExp(`\\b${pokemonName}\\b`, 'i');
		if (regex.test(lowerCardName)) return pokemonName;
	}
	return null;
}

function createCardCode(card: Card, pokemonNumber: number | null): string {
	if (!pokemonNumber) {
		return `unknown_card_${card.card_number?.replace('/', '_') || 'unknown'}`;
	}
	const setCode = card.set_code?.toLowerCase()?.trim() || 'unknown_set';
	const cardNumber = card.card_number?.split('/')[0]?.trim() || 'unknown_number';
	return `pokemon_${pokemonNumber}_${setCode}_${cardNumber}`;
}

export interface Card {
	url: string;
	image_url: string;
	name: string;
	card_type: string;
	pokemon_type: string;
	set_name: string;
	set_code: string;
	card_number: string;
	rarity: string;
	illustrator: string;
	price: string;
}

export interface FinalCard {
	artist: string;
	cardCode: string;
	cardMarketUpdatedAt: string;
	cardMarketUrl: string;
	image: string;
	meanColor: string;
	name: string;
	pokemonNumber: number | null;
	rarity: string;
	setName: string;
	supertype: string;
	types: string;
}

function toFinalCard(card: Card): FinalCard {
	const fixedName = fixEncoding(card.name);
	const pokemonName = findPokemonInCardName(fixedName);
	const pokemonNumber = pokemonName ? pokemonNameToNumber[pokemonName] : null;
	const cardCode = createCardCode(card, pokemonNumber);
	let supertype = '';
	if (card.card_type && card.card_type.includes('Pok')) {
		supertype = 'Pokémon';
	} else if (card.card_type === 'Trainer') {
		supertype = 'Trainer';
	} else if (card.card_type === 'Energy') {
		supertype = 'Energy';
	} else {
		supertype = fixEncoding(card.card_type) || '';
	}
	return {
		artist: fixEncoding(card.illustrator) || '',
		cardCode,
		cardMarketUpdatedAt: '2025/04/24',
		cardMarketUrl: card.url || '',
		image: card.image_url || '',
		meanColor: 'FFFFFF',
		name: fixedName || '',
		pokemonNumber: pokemonNumber || null,
		rarity: fixEncoding(card.rarity) || '',
		setName: fixEncoding(card.set_name) || '',
		supertype,
		types: fixEncoding(card.pokemon_type) || '',
	};
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMaxPages(params: Record<string, string | number>): Promise<number> {
	const url = `${BASE_URL}?${new URLSearchParams(params as any).toString()}`;
	const res = await axios.get(url, { headers: HEADERS });
	const $ = cheerio.load(res.data);
	const paginationContainer = $('ul#card-search-result-pagination');
	if (paginationContainer.length) {
		const lastPageItem = paginationContainer.find('li.pagination-item-last a');
		if (lastPageItem.length && /^\d+$/.test(lastPageItem.text().trim())) {
			return parseInt(lastPageItem.text().trim(), 10);
		}
		let maxPage = 1;
		paginationContainer.find('li.pagination-item').each((_, el: any) => {
			const text = $(el).text().trim();
			const num = parseInt(text, 10);
			if (!isNaN(num)) maxPage = Math.max(maxPage, num);
		});
		if (maxPage > 1) return maxPage;
	}
	const itemCountDiv = $('div.results-count');
	if (itemCountDiv.length) {
		const countText = itemCountDiv.text().trim();
		const match = countText.match(/of\s+(\d+)\s+items?/i);
		if (match) {
			const totalItems = parseInt(match[1], 10);
			const cardsPerPage = Number(params.cardsPerPage) || 60;
			return Math.ceil(totalItems / cardsPerPage);
		}
	}
	return 1;
}

async function getCardUrls(params: Record<string, string | number>, pageNum: number): Promise<string[]> {
	const pageParams = { ...params };
	if (pageNum > 1) pageParams['page'] = pageNum;
	const url = `${BASE_URL}?${new URLSearchParams(pageParams as any).toString()}`;
	const res = await axios.get(url, { headers: HEADERS });
	const $ = cheerio.load(res.data);
	const cardLinks = $('a.card-image-grid-item-link');
	return cardLinks.map((_: unknown, el: any) => CARD_BASE_URL + ($(el).attr('href') ?? '')).get();
}

async function scrapeCardData(url: string): Promise<Card | null> {
	try {
		const res = await axios.get(url, { headers: HEADERS });
		const $ = cheerio.load(res.data);
		const card: Card = {
			url,
			image_url: '',
			name: '',
			card_type: '',
			pokemon_type: '',
			set_name: '',
			set_code: '',
			card_number: '',
			rarity: '',
			illustrator: '',
			price: ''
		};
		const imageContainer = $('#card-image-container');
		if (imageContainer.length && imageContainer.find('img').length) {
			card.image_url = imageContainer.find('img').attr('src') ?? '';
		}
		const titleElement = $('#card-info-title');
		if (titleElement.length && titleElement.find('a').length) {
			card.name = titleElement.find('a').text().trim();
		}
		const cardTypeContainer = $('.card-type-container');
		if (cardTypeContainer.length) {
			card.card_type = cardTypeContainer.text().trim();
		}
		const energyTypeSymbol = $('.energy-type-symbol');
		if (energyTypeSymbol.length && energyTypeSymbol.attr('title')) {
			card.pokemon_type = energyTypeSymbol.attr('title') ?? '';
		}
		const setNameElement = $('#card-info-footer-item-text-part-expansion-name');
		if (setNameElement.length) {
			card.set_name = setNameElement.text().trim();
		}
		const setCodeElement = $('#card-info-footer-item-text-part-expansion-code');
		if (setCodeElement.length) {
			card.set_code = setCodeElement.text().trim();
		}
		const footerItems = $('.card-info-footer-item-text-part');
		footerItems.each((_: unknown, el: any) => {
			const text = $(el).text().trim();
			if (/\d+\/\d+/.test(text)) {
				card.card_number = text;
			}
		});
		const rarityLink = $("a.card-info-footer-item-text-part[href*='rarities=']");
		if (rarityLink.length) {
			card.rarity = rarityLink.text().trim();
		} else {
			footerItems.each((_: unknown, el: any) => {
				const text = $(el).text();
				if (text.includes('Rarity:')) {
					card.rarity = text.replace('Rarity:', '').trim();
				}
			});
		}
		const illustratorTitleDiv = $("div.card-info-footer-item-title:contains('Illustrators')");
		if (illustratorTitleDiv.length && illustratorTitleDiv.parent().find("a[href*='illustrator=']").length) {
			card.illustrator = illustratorTitleDiv.parent().find("a[href*='illustrator=']").text().trim();
		} else {
			footerItems.each((_: unknown, el: any) => {
				const item = $(el);
				if (item.text().includes('Illus') && item.find('a').length) {
					card.illustrator = item.find('a').text().trim();
				}
			});
		}
		const priceButton = $("button.card-price-details-modal-show-button");
		if (priceButton.length) {
			const priceText = priceButton.text().trim();
			const priceMatch = priceText.match(/(\$\d+\.\d+|\$\d+)/);
			if (priceMatch) {
				card.price = priceMatch[1];
			} else {
				card.price = priceText;
			}
		}
		return card;
	} catch (e) {
		console.error('Error scraping', url, e);
		return null;
	}
}

function formatTime(seconds: number): string {
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	if (seconds < 3600) return `${(seconds / 60).toFixed(1)}min`;
	return `${(seconds / 3600).toFixed(1)}h`;
}

export async function fetchTCGCollectorCards() {
	const params = {
		releaseDateOrder: 'newToOld',
		displayAs: 'images',
		cardsPerPage: 120
	};
	const maxPages = await getMaxPages(params);
	console.log(`Found ${maxPages} pages.`);
	const allFinalCards: FinalCard[] = [];
	const failedUrls: string[] = [];
	const startTime = Date.now();
	for (let page = 1; page <= maxPages; page++) {
		const pageStart = Date.now();
		console.log(`\nScraping page ${page}/${maxPages}`);
		const urls = await getCardUrls(params, page);
		for (let i = 0; i < urls.length; i += WORKERS) {
			const chunk = urls.slice(i, i + WORKERS);
			const results = await Promise.all(chunk.map(url => scrapeCardData(url)));
			results.forEach((card, idx) => {
				const url = chunk[idx];
				if (card) {
					const finalCard = toFinalCard(card);
					allFinalCards.push(finalCard);
					console.log(`[OK] ${finalCard.name ? finalCard.name : url}`);
				} else {
					failedUrls.push(url);
					console.log(`[FAIL] ${url}`);
				}
			});
			await sleep(500);
		}
		const elapsed = (Date.now() - startTime) / 1000;
		const pageElapsed = (Date.now() - pageStart) / 1000;
		console.log(`Page ${page} done in ${formatTime(pageElapsed)}. Total cards: ${allFinalCards.length}, Failed: ${failedUrls.length}`);
		const remainingPages = maxPages - page;
		const avgPageTime = elapsed / page;
		const estRemaining = avgPageTime * remainingPages;
		console.log(`Elapsed: ${formatTime(elapsed)} | Est. remaining: ${formatTime(estRemaining)}`);
		await fs.writeFile(path.join('src/assets', 'jp-cards-full.json'), JSON.stringify(allFinalCards, null, 0), 'utf-8');
		if (DEBUG_MODE) {
			console.log('DEBUG_MODE active : stop after first page.');
			break;
		}
	}
	const totalElapsed = (Date.now() - startTime) / 1000;
	console.log(`\nScraping finished. Total cards: ${allFinalCards.length}, Failed: ${failedUrls.length}`);
	console.log(`Total time: ${formatTime(totalElapsed)}`);
	if (failedUrls.length) {
		console.log('Failed URLs:');
		failedUrls.forEach(url => console.log(url));
	}
} 