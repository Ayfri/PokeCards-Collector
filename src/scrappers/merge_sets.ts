import * as fs from 'node:fs/promises';
import {CARDS, SETS} from './files';

interface Set {
	name: string;
	logo: string;
	printedTotal: number;
	ptcgoCode: string;
	releaseDate: string;
}

interface Card {
	artist: string;
	cardCode: string;
	cardMarketUpdatedAt: string;
	cardMarketUrl: string;
	image: string;
	meanColor: string;
	name: string;
	pokemonNumber: number;
	price: number;
	rarity: string;
	setName: string;
	supertype: string;
	types: string;
}

export async function mergeSetsInExistingCards() {
	console.log('Starting to merge sets in existing cards data...');

	try {
		// Load sets
		console.log('Loading sets data...');
		const setsData = await fs.readFile(SETS, 'utf-8')
		                         .then(data => JSON.parse(data) as Set[])
		                         .catch(() => {
			                         console.error('Sets data not found. Run the sets scraper first.');
			                         return [];
		                         });

		if (setsData.length === 0) {
			console.error('No sets data available. Run the sets scraper first.');
			return;
		}

		console.log(`Loaded ${setsData.length} sets.`);

		// Load cards data
		console.log('Loading cards data...');
		const cardsData = await fs.readFile(CARDS, 'utf-8')
		                          .then(data => JSON.parse(data) as Card[])
		                          .catch(() => {
			                          console.error('Cards data not found. Run the cards scraper first.');
			                          return [];
		                          });

		if (cardsData.length === 0) {
			console.error('No cards data available. Run the cards scraper first.');
			return;
		}

		console.log(`Loaded ${cardsData.length} cards.`);

		// Get all the set names that exist in the cards data
		const cardSetNames = new Set<string>(cardsData.map(card => card.setName));
		console.log(`Found ${cardSetNames.size} unique set names in cards data.`);

		// Get all the set names that exist in the sets data
		const validSetNames = new Set<string>(setsData.map(set => set.name));
		console.log(`Found ${validSetNames.size} unique set names in sets data.`);

		// Find set names in cards that no longer exist in the sets data
		const obsoleteSetNames = [...cardSetNames].filter(name => !validSetNames.has(name));

		if (obsoleteSetNames.length === 0) {
			console.log('No obsolete set names found. No merging needed.');
			return;
		}

		console.log(`Found ${obsoleteSetNames.length} obsolete set names that need mapping:`);
		obsoleteSetNames.forEach(name => console.log(`- ${name}`));

		// Group sets by ptcgoCode to find duplicate sets that have been merged
		const setsByPtcgoCode: Record<string, Set[]> = {};

		for (const set of setsData) {
			if (!set.ptcgoCode) continue;

			if (!setsByPtcgoCode[set.ptcgoCode]) {
				setsByPtcgoCode[set.ptcgoCode] = [];
			}

			setsByPtcgoCode[set.ptcgoCode].push(set);
		}

		// Create mappings for obsolete sets
		const setMappings: Record<string, {
			primarySetName: string,
			primarySetCode: string
		}> = {};

		// Attempt to find the corresponding primary set for each obsolete set
		for (const obsoleteSetName of obsoleteSetNames) {
			// Try to find a primary set with the same ptcgoCode in the naming
			let found = false;

			// Known specific cases that require special handling
			const specialCases: Record<string, string> = {
				"Hidden Fates Shiny Vault": "Hidden Fates",
				"Shining Fates Shiny Vault": "Shining Fates",
				"Celebrations: Classic Collection": "Celebrations",
				"Brilliant Stars Trainer Gallery": "Brilliant Stars",
				"Astral Radiance Trainer Gallery": "Astral Radiance",
				"Lost Origin Trainer Gallery": "Lost Origin",
				"Silver Tempest Trainer Gallery": "Silver Tempest",
				"Crown Zenith Galarian Gallery": "Crown Zenith"
			};

			// Try first with special cases for sets we know are problematic
			if (specialCases[obsoleteSetName]) {
				const baseName = specialCases[obsoleteSetName];
				const baseSet = setsData.find(set => set.name === baseName);

				if (baseSet) {
					const setCode = baseSet.logo.split('/').at(-2) || '';
					setMappings[obsoleteSetName] = {
						primarySetName: baseSet.name,
						primarySetCode: setCode
					};

					console.log(`Mapping obsolete set "${obsoleteSetName}" to primary set "${baseSet.name}" (${setCode}) via special case`);
					found = true;
				}
			}

			// Inverse case - if we see Hidden Fates, we want to keep it as primary
			// but as it's in obsoleteSetNames, it means it was erroneously removed
			if (obsoleteSetName === "Hidden Fates") {
				// Look for Hidden Fates Shiny Vault in the valid sets
				const shinyVaultSet = setsData.find(set => set.name === "Hidden Fates Shiny Vault");
				if (shinyVaultSet) {
					// Create a new mapping to invert the relationship
					const hiddenFatesCode = "sm115"; // Known code for Hidden Fates

					console.log(`Special case: Found Hidden Fates in obsolete sets but it should be the primary set!`);
					console.log(`Will map "Hidden Fates Shiny Vault" cards to "Hidden Fates" (${hiddenFatesCode})`);

					// This mapping will be used for Hidden Fates Shiny Vault cards
					setMappings["Hidden Fates Shiny Vault"] = {
						primarySetName: "Hidden Fates",
						primarySetCode: hiddenFatesCode
					};

					// Restore Hidden Fates in the sets list
					const hiddenFatesSetIndex = setsData.findIndex(set => set.name === "Hidden Fates Shiny Vault");
					if (hiddenFatesSetIndex !== -1) {
						console.log(`Replacing "Hidden Fates Shiny Vault" with "Hidden Fates" in sets list`);
						// Create a new set based on Hidden Fates Shiny Vault but with the correct name and code
						setsData[hiddenFatesSetIndex] = {
							...shinyVaultSet,
							name: "Hidden Fates",
							logo: shinyVaultSet.logo.replace(/sma\/logo/, "sm115/logo"),
							ptcgoCode: "HIF" // Make sure the code is correct
						};
					}

					found = true;
				}
			}

			// If it's not a special case, try with our generic pattern matching logic
			if (!found) {
				// Check for common patterns in set names like "Trainer Gallery" or "Shiny Vault"
				const patterns = [
					/^(.+)\s+Trainer\s+Gallery$/i,
					/^(.+)\s+Galarian\s+Gallery$/i,
					/^(.+)\s+Shiny\s+Vault$/i,
					/^(.+):\s+Classic\s+Collection$/i
				];

				// Try each pattern
				for (const pattern of patterns) {
					const match = obsoleteSetName.match(pattern);
					if (match && match[1]) {
						const baseName = match[1].trim();
						const baseSet = setsData.find(set => set.name === baseName);

						if (baseSet) {
							const setCode = baseSet.logo.split('/').at(-2) || '';
							setMappings[obsoleteSetName] = {
								primarySetName: baseSet.name,
								primarySetCode: setCode
							};

							console.log(`Mapping obsolete set "${obsoleteSetName}" to primary set "${baseSet.name}" (${setCode}) via pattern match`);
							found = true;
							break;
						}
					}
				}
			}

			// If still not found, try by substring search (case where the obsolete set is a sub-name of the valid set)
			if (!found) {
				// Look for valid sets that contain the obsolete name (or vice versa)
				const matchingSets = setsData.filter(set =>
					set.name.includes(obsoleteSetName) ||
					obsoleteSetName.includes(set.name)
				);

				if (matchingSets.length > 0) {
					// Sort by name length to favor short names
					matchingSets.sort((a, b) => a.name.length - b.name.length);
					const bestMatch = matchingSets[0];

					const setCode = bestMatch.logo.split('/').at(-2) || '';
					setMappings[obsoleteSetName] = {
						primarySetName: bestMatch.name,
						primarySetCode: setCode
					};

					console.log(`Mapping obsolete set "${obsoleteSetName}" to primary set "${bestMatch.name}" (${setCode}) via substring match`);
					found = true;
				}
			}

			// If still not found, try by ptcgoCode lookup
			if (!found) {
				// Search by ptcgoCode for sets that have the same code (like HIF for Hidden Fates)
				const obsoleteSetPtcgoCode =
					obsoleteSetName === "Hidden Fates" ? "HIF" :
					obsoleteSetName === "Shining Fates" ? "SHF" : null;

				if (obsoleteSetPtcgoCode) {
					const matchingSets = setsData.filter(set => set.ptcgoCode === obsoleteSetPtcgoCode);

					if (matchingSets.length > 0) {
						// Prefer the set with the shortest name
						matchingSets.sort((a, b) => a.name.length - b.name.length);
						const bestMatch = matchingSets[0];

						const setCode = bestMatch.logo.split('/').at(-2) || '';
						setMappings[obsoleteSetName] = {
							primarySetName: bestMatch.name,
							primarySetCode: setCode
						};

						console.log(`Mapping obsolete set "${obsoleteSetName}" to primary set "${bestMatch.name}" (${setCode}) via ptcgoCode match`);
						found = true;
					}
				}
			}

			// If not found after all these attempts
			if (!found) {
				console.log(`Warning: Could not find mapping for obsolete set "${obsoleteSetName}". Cards with this set will be kept as is.`);
			}
		}

		// Update card data to use the primary set
		let updatedCount = 0;

		const updatedCards = cardsData.map(card => {
			if (setMappings[card.setName]) {
				const mapping = setMappings[card.setName];

				// Update cardCode to use the primary set code
				const cardCodeParts = card.cardCode.split('_');
				if (cardCodeParts.length >= 3) {
					cardCodeParts[2] = mapping.primarySetCode;
				}

				// Create updated card object - keep the original image URL
				const updatedCard = {
					...card,
					cardCode: cardCodeParts.join('_'),
					setName: mapping.primarySetName
				};

				updatedCount++;
				return updatedCard;
			}

			return card;
		});

		if (updatedCount === 0) {
			console.log('No cards needed updating. All cards already use proper set references.');
			return;
		}

		console.log(`Updated ${updatedCount} cards to use their primary set.`);

		// Save updated cards data
		console.log('Saving updated cards data...');
		await fs.writeFile(CARDS, JSON.stringify(updatedCards));

		// Update printedTotal in sets based on actual card counts
		console.log('Updating card counts in sets data...');

		// Count cards per set
		const cardCountBySet: Record<string, number> = {};
		for (const card of updatedCards) {
			if (!cardCountBySet[card.setName]) {
				cardCountBySet[card.setName] = 0;
			}
			cardCountBySet[card.setName]++;
		}

		// Update printedTotal in sets
		let setsUpdated = 0;
		const updatedSets = setsData.map(set => {
			const actualCardCount = cardCountBySet[set.name] || 0;
			if (actualCardCount !== set.printedTotal) {
				console.log(`Updating card count for set "${set.name}": ${set.printedTotal} -> ${actualCardCount}`);
				setsUpdated++;
				return {
					...set,
					printedTotal: actualCardCount
				};
			}
			return set;
		});

		// Clean up sets that no longer have cards after merging
		const filteredSets = updatedSets.filter(set => {
			// Check if it has cards
			const cardCount = cardCountBySet[set.name] || 0;

			// If it's Hidden Fates Shiny Vault, we remove it as it has been replaced by Hidden Fates
			if (set.name === "Hidden Fates Shiny Vault") {
				console.log(`Removing "${set.name}" as it has been replaced by Hidden Fates`);
				return false;
			}

			// If it's a set with no cards and not a primary set, we remove it
			if (cardCount === 0 && Object.values(setMappings).some(mapping => mapping.primarySetName !== set.name)) {
				console.log(`Removing empty set "${set.name}" with 0 cards`);
				return false;
			}

			return true;
		});

		if (setsUpdated > 0 || filteredSets.length < updatedSets.length) {
			console.log(`Updated card counts for ${setsUpdated} sets.`);
			console.log(`Removed ${updatedSets.length - filteredSets.length} empty sets.`);
			console.log('Saving updated sets data...');
			await fs.writeFile(SETS, JSON.stringify(filteredSets));
		} else {
			console.log('No sets needed card count updates.');
		}

		console.log('Set merging completed successfully!');
	} catch (error) {
		console.error('Error during set merging:', error);
	}
}
