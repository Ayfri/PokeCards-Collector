import * as fs from 'node:fs/promises';
import type { Card } from '$lib/types';
import { CARDS, SETS } from './files';
import { fetchFromApi } from './api_utils';
import type { FetchedSet } from './tcg_api_types';

interface ResponseSets {
    data: FetchedSet[];
}

async function fetchAndFilterSets() {
	const response = await fetchFromApi<ResponseSets>('sets', {
		select: 'name,images,printedTotal,ptcgoCode,releaseDate',
	});
	const sets = response.data;

	console.log(`Found ${sets.length} sets!`);

	// Create sets data with proper structure
	const initialSetsData = sets.map(set => ({
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
		const setsWithCards = sets.filter(set => cards.some(card => card.setCode === set.ptcgoCode));

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
		console.error(`Error reading ${CARDS} for set filtering:`, error);
		return initialSetsData; // Return initial list if card reading fails
	}
}

export async function fetchSets() {
	const sets = await fetchAndFilterSets();
	console.log(`Filtered sets, writing ${sets.length} sets!`);
	await fs.writeFile(SETS, JSON.stringify(sets));
	console.log(`Finished writing sets to ${SETS}`);
} 