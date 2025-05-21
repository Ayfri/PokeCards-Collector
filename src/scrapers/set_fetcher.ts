import * as fs from 'node:fs/promises';
import { SETS } from './files';
import { fetchFromApi } from './api_utils';
import type { FetchedSet } from './tcg_api_types';

interface ResponseSets {
	data: FetchedSet[];
}

// Define the special case name mappings
const specialCaseMappings: Array<{ primaryName: string; aliasNames: string[] }> = [
	{ primaryName: 'Hidden Fates', aliasNames: ['Hidden Fates Shiny Vault'] },
	{ primaryName: 'Shining Fates', aliasNames: ['Shining Fates Shiny Vault'] },
	{ primaryName: 'Celebrations', aliasNames: ['Celebrations: Classic Collection'] },
	{ primaryName: 'Brilliant Stars', aliasNames: ['Brilliant Stars Trainer Gallery'] },
	{ primaryName: 'Astral Radiance', aliasNames: ['Astral Radiance Trainer Gallery'] },
	{ primaryName: 'Lost Origin', aliasNames: ['Lost Origin Trainer Gallery'] },
	{ primaryName: 'Silver Tempest', aliasNames: ['Silver Tempest Trainer Gallery'] },
	{ primaryName: 'Crown Zenith', aliasNames: ['Crown Zenith Galarian Gallery'] }
];

// Define the structure for the processed set data
interface ProcessedSet {
	aliases?: string[]; // ptcgoCodes from merged sets
	name: string;
	logo: string | undefined;
	printedTotal: number | undefined;
	ptcgoCode: string | undefined;
	releaseDate: string | undefined;
	series: string | undefined;
}

// Helper to safely add printed totals (treat undefined as 0)
function addPrintedTotals(total1: number | undefined, total2: number | undefined): number {
	return (total1 ?? 0) + (total2 ?? 0);
}

export function getSetCodeFromImage(imageUrl: string): string | undefined {
	const parts = imageUrl.split("/");
	return parts.at(-2);
}


async function fetchAndFilterSets() {
	const response = await fetchFromApi<ResponseSets>('sets', {
		select: 'name,images,printedTotal,ptcgoCode,releaseDate,series',
	});
	let allSets = response.data; // Use let as we'll filter it

	console.log(`Found ${allSets.length} sets initially!`);

	// Store data derived from name merges: <primaryName, { aliasUrlCodes: string[], aliasTotal: number }>
	const nameMergeData = new Map<string, { aliasUrlCodes: string[]; aliasTotal: number }>();
	const setsToRemoveByName = new Set<string>(); // Store names of sets merged by name

	// --- Step 1: Process Special Name Merges ---
	console.log('Processing special name merges...');
	const allSetsMap = new Map(allSets.map(set => [set.name, set])); // For quick lookup

	for (const mapping of specialCaseMappings) {
		const primarySet = allSetsMap.get(mapping.primaryName);
		if (!primarySet) {
			console.warn(`Primary set "${mapping.primaryName}" not found for special case mapping.`);
			continue;
		}

		// Initialize or get existing data for the primary set
		let mergeInfo = nameMergeData.get(mapping.primaryName);
		if (!mergeInfo) {
			mergeInfo = { aliasUrlCodes: [], aliasTotal: 0 }; // Store url codes now
			nameMergeData.set(mapping.primaryName, mergeInfo);
		}

		for (const aliasName of mapping.aliasNames) {
			const aliasSet = allSetsMap.get(aliasName);
			if (aliasSet) {
				console.log(`Merging "${aliasName}" (Total: ${aliasSet.printedTotal ?? 0}) into "${mapping.primaryName}" based on name.`);
				const aliasUrlCode = getSetCodeFromImage(aliasSet.images.logo);
				if (aliasUrlCode) {
					console.log(`   -> Storing derived URL code '${aliasUrlCode}' as alias.`);
					mergeInfo.aliasUrlCodes.push(aliasUrlCode);
				} else {
					console.warn(`   -> Could not derive URL code for alias set "${aliasName}". Skipping alias.`);
				}
				mergeInfo.aliasTotal = addPrintedTotals(mergeInfo.aliasTotal, aliasSet.printedTotal);
				setsToRemoveByName.add(aliasName); // Mark alias set for removal
			} else {
				console.warn(`Alias set "${aliasName}" not found for primary "${mapping.primaryName}".`);
			}
		}
	}

	// Filter out the sets that were merged by name
	allSets = allSets.filter(set => !setsToRemoveByName.has(set.name));
	console.log(`Sets remaining after name merge: ${allSets.length}`);

	// --- Step 2: Separate by ptcgoCode (among remaining sets) ---
	const setsWithCode = allSets.filter(set => set.ptcgoCode);
	const setsWithoutCode = allSets.filter(set => !set.ptcgoCode);

	console.log(`Processing ${setsWithCode.length} sets with ptcgoCode for potential code merges.`);
	console.log(`Keeping ${setsWithoutCode.length} sets without ptcgoCode separately.`);

	try {
		// --- Step 3: Group and Merge by ptcgoCode ---
		const setsByCode = setsWithCode.reduce((acc, set) => {
			const setCode = getSetCodeFromImage(set.images.logo);
			if (!setCode) {
				console.log(set);
			}
			acc[setCode!] ??= [];
			acc[setCode!].push(set);
			return acc;
		}, {} as Record<string, FetchedSet[]>);

		const codeMergedSetsResult: ProcessedSet[] = [];

		for (const [urlCode, codeSetGroup] of Object.entries(setsByCode)) {
			let primarySet: FetchedSet;
			let sharedUrlCodeAlias: string | undefined = undefined; // Store the urlCode if a code merge happens
			// Calculate the total printed count for the entire group merged by code
			const groupTotalPrinted = codeSetGroup.reduce((sum, currentSet) => addPrintedTotals(sum, currentSet.printedTotal), 0);

			if (codeSetGroup.length === 1) {
				primarySet = codeSetGroup[0];
			} else {
				console.log(`Found ${codeSetGroup.length} sets with the same URL code: ${urlCode}. Combined Total: ${groupTotalPrinted}`);
				codeSetGroup.forEach(set => {
					console.log(`- ${set.name} (Total: ${set.printedTotal ?? 0}), Derived code: ${getSetCodeFromImage(set.images.logo)}`);
				});

				// Keep the sorting logic to select the primary set
				const setsWithDerivedCodes = codeSetGroup.map(set => ({
					set,
					derivedCode: getSetCodeFromImage(set.images.logo) || ''
				}));
				setsWithDerivedCodes.sort((a, b) => a.derivedCode.length - b.derivedCode.length);
				primarySet = setsWithDerivedCodes[0].set;
				const primaryDerivedCode = setsWithDerivedCodes[0].derivedCode;

				// Set the alias to the urlCode that caused the merge
				sharedUrlCodeAlias = urlCode;

				console.log(`Selected primary set by code: ${primarySet.name} with derived code ${primaryDerivedCode}`);
				console.log(`   -> Merging based on shared URL code: ${urlCode}. Storing this URL code as an alias.`);
			}

			// Get potential merge data from the name-based merge step
			const nameMergeInfo = nameMergeData.get(primarySet.name);

			// Combine aliases: derived URL codes from name merges + shared urlCode from code merge (if it happened)
			const combinedAliases = [
				...(nameMergeInfo?.aliasUrlCodes ?? []),
				...(sharedUrlCodeAlias ? [sharedUrlCodeAlias] : []) // Add shared urlCode only if a code merge occurred
			];

			// Calculate final total: sum from code group + sum from name alias merges (if any)
			const finalTotal = addPrintedTotals(groupTotalPrinted, nameMergeInfo?.aliasTotal ?? 0);

			codeMergedSetsResult.push({
				name: primarySet.name,
				logo: primarySet.images.logo,
				printedTotal: finalTotal > 0 ? finalTotal : undefined, // Store final sum, or undefined if 0
				ptcgoCode: primarySet.ptcgoCode,
				releaseDate: primarySet.releaseDate,
				series: primarySet.series,
				// Store unique aliases, only if there are any
				aliases: combinedAliases.length > 0 ? [...new Set(combinedAliases)] : undefined
			});
		}

		// --- Step 4: Combine and Sort Final Results ---
		const finalSetsData: ProcessedSet[] = [
			...codeMergedSetsResult,
			...setsWithoutCode.map(set => {
				// Check if this set was a primary target in a name merge
				const nameMergeInfo = nameMergeData.get(set.name);
				const finalTotal = addPrintedTotals(set.printedTotal, nameMergeInfo?.aliasTotal ?? 0);
				const combinedAliases = nameMergeInfo?.aliasUrlCodes ?? []; // Get url codes from name merge

				return {
					name: set.name,
					logo: set.images.logo,
					printedTotal: finalTotal > 0 ? finalTotal : undefined,
					ptcgoCode: set.ptcgoCode, // Will be undefined/null
					releaseDate: set.releaseDate,
					series: set.series,
					// Store unique aliases, only if there are any
					aliases: combinedAliases.length > 0 ? [...new Set(combinedAliases)] : undefined
				};
			}),
		];

		finalSetsData.sort((a, b) => a.name.localeCompare(b.name));

		console.log(`Finished processing. Total sets after all merges: ${finalSetsData.length}`);
		return finalSetsData;

	} catch (error) {
		console.error(`Error during set merging/filtering:`, error);
		// Fallback: return original full list mapped to the target structure, no merges
		return response.data.map(set => ({
			name: set.name,
			logo: set.images.logo,
			printedTotal: set.printedTotal,
			ptcgoCode: set.ptcgoCode,
			releaseDate: set.releaseDate,
			series: set.series,
		}));
	}
}

export async function fetchSets() {
	const sets = await fetchAndFilterSets();
	console.log(`Filtered sets, writing ${sets.length} sets!`);
	await fs.writeFile(SETS, JSON.stringify(sets, null, '\t')); // Added indentation
	console.log(`Finished writing sets to ${SETS}`);
} 