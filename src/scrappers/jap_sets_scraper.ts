import fs from 'fs/promises';
import path from 'path';

const INPUT = path.join('src/assets', 'jp-cards-full.json');
const OUTPUT = path.join('src/assets', 'jp-sets-full.json');

interface Card {
	setName: string;
	cardCode: string;
	cardMarketUrl: string;
	// card_number?: string; // Pas présent, à extraire
}

interface SetInfo {
	setName: string;
	setCode: string;
	totalCards: number;
	officialTotal: number;
	// cardNumbers: string[]; // supprimé
}

function extractSetCode(cardCode: string): string {
	const parts = cardCode.split('_');
	if (parts.length >= 4 && isNaN(Number(parts[2]))) {
		return parts[2];
	}
	return 'unknown';
}

function extractCardNumber(cardMarketUrl: string): string | null {
	// Ex: ...-001-049, ...-030-029, ...-001-049
	const match = cardMarketUrl.match(/-(\d{3,})-(\d{2,})$/);
	if (match) {
		return `${match[1]}/${match[2]}`;
	}
	return null;
}

async function main() {
	const raw = await fs.readFile(INPUT, 'utf-8');
	const cards: Card[] = JSON.parse(raw);

	const sets: Record<string, SetInfo & { __cardNumbers: string[] }> = {};

	for (const card of cards) {
		const setName = card.setName?.trim() || 'Unknown';
		const setCode = extractSetCode(card.cardCode);
		const cardNumber = extractCardNumber(card.cardMarketUrl);
		if (!setName || !setCode || !cardNumber) continue;

		const setKey = `${setName}|||${setCode}`;
		if (!sets[setKey]) {
			sets[setKey] = {
				setName,
				setCode,
				totalCards: 0,
				officialTotal: 0,
				__cardNumbers: [],
			};
		}
		if (!sets[setKey].__cardNumbers) sets[setKey].__cardNumbers = [];
		sets[setKey].__cardNumbers.push(cardNumber);
	}

	for (const set of Object.values(sets)) {
		set.totalCards = set.__cardNumbers.length;
		let maxOfficial = 0;
		for (const num of set.__cardNumbers) {
			const match = num.match(/\d+\/(\d+)/);
			if (match) {
				const official = parseInt(match[1], 10);
				if (official > maxOfficial) maxOfficial = official;
			}
		}
		set.officialTotal = maxOfficial;
	}

	// Fusionne les sets ayant le même setName
	const mergedSets: Record<string, SetInfo & { __cardNumbers: string[] }> = {};

	for (const set of Object.values(sets)) {
		const key = set.setName;
		if (!mergedSets[key]) {
			mergedSets[key] = {
				setName: set.setName,
				setCode: set.setCode !== 'unknown' ? set.setCode : '',
				totalCards: 0,
				officialTotal: 0,
				__cardNumbers: [],
			};
		}
		if (set.setCode !== 'unknown') {
			mergedSets[key].setCode = set.setCode;
		}
		mergedSets[key].__cardNumbers.push(...set.__cardNumbers);
	}

	for (const set of Object.values(mergedSets)) {
		set.__cardNumbers = Array.from(new Set(set.__cardNumbers));
		set.totalCards = set.__cardNumbers.length;
		let maxOfficial = 0;
		for (const num of set.__cardNumbers) {
			const match = num.match(/\d+\/(\d+)/);
			if (match) {
				const official = parseInt(match[1], 10);
				if (official > maxOfficial) maxOfficial = official;
			}
		}
		set.officialTotal = maxOfficial;
	}

	const result = Object.values(mergedSets)
		.map(({ setName, setCode, totalCards, officialTotal }) => ({
			name: setName,
			ptcgoCode: setCode,
			printedTotal: totalCards,
			officialTotal
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	await fs.writeFile(OUTPUT, JSON.stringify(result, null), 'utf-8');
	console.log(`Done. ${result.length} sets written to ${OUTPUT}`);
}

export async function fetchJapaneseSets() {
	await main();
} 