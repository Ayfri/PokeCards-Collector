#!/usr/bin/env node

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { downloadAllImages } from './src/scrappers/download_images';
import { fetchAndSaveAllCards } from './src/scrappers/card_fetcher';
import { fetchHoloCards } from './src/scrappers/holo_scraper';
import { fetchPokemons } from './src/scrappers/pokemon_scraper';
import { fetchPokemonTypes } from './src/scrappers/types_scraper';
import { fetchSets } from './src/scrappers/set_fetcher';
import { getCardMasks } from './src/scrappers/foil_scraper';
import { fetchTCGCollectorCards } from './src/scrappers/jap_cards_scraper';
import { createInterface } from 'node:readline/promises'
import { fetchJapaneseSets } from './src/scrappers/jap_sets_scraper';

interface ScraperOption {
    name: string;
    description: string;
    action: () => Promise<void>;
}

const baseScrapers: ScraperOption[] = [
    {
        name: 'cards',
        description: 'Fetch all Pokémon cards and prices from TCG API',
        action: fetchAndSaveAllCards
    },
    {
        name: 'japanese-cards',
        description: 'Scrape Japanese card data from tcgcollector.com',
        action: fetchTCGCollectorCards
    },
    {
        name: 'sets',
        description: 'Fetch all card sets from TCG API',
        action: fetchSets
    },
    {
        name: 'japanese-sets',
        description: 'Fetch all card sets from jp-cards-full.json',
        action: fetchJapaneseSets
    },
    {
        name: 'download-images',
        description: 'Download low-res card images based on cards.json',
        action: downloadAllImages
    },
    {
        name: 'pokemons',
        description: 'Fetch all Pokémon data from PokéAPI',
        action: fetchPokemons
    },
    {
        name: 'foil',
        description: 'Generate foil URLs for holo cards',
        action: getCardMasks
    },
    {
        name: 'holo',
        description: 'Extract holographic cards from cards dataset',
        action: fetchHoloCards
    },
    {
        name: 'types',
        description: 'Extract all Pokémon types from cards dataset',
        action: fetchPokemonTypes
    },
];

const uploadFilesTask = {
	name: 'upload-files',
	description: 'Upload all default files to R2 bucket (Cloudflare)',
	action: async () => {
		try {
			const { uploadFile, filesToUpload } = await import('./src/scrappers/upload.js')
			const path = await import('node:path')
			for (const filePath of filesToUpload) {
				const objectName = path.basename(filePath)
				try {
					await uploadFile(filePath, objectName)
					console.log(`Uploaded: ${filePath}`)
				} catch (error) {
					console.error(`Failed to upload: ${filePath}`, error)
				}
			}
			console.log('All uploads complete!')
		} catch (error) {
			console.error('Upload failed:', error)
		}
	}
}

baseScrapers.push(uploadFilesTask)
// baseScrapers.sort((a, b) => a.name.localeCompare(b.name))

const scrapers: ScraperOption[] = [
    {
        name: 'default',
        description: 'Run cards, sets, and merge-sets scrapers in sequence',
        action: async () => {
            const defaultScrapers = [
                baseScrapers.find(s => s.name === 'cards'),
                baseScrapers.find(s => s.name === 'sets'),
                baseScrapers.find(s => s.name === 'merge-sets')
            ].filter(Boolean);

            for (const scraper of defaultScrapers) {
                if (!scraper) continue;
                console.log(chalk.yellow(`Running ${scraper.name} scraper...`));
                try {
                    await scraper.action();
                    console.log(chalk.green(`✓ ${scraper.name} scraper completed successfully!`));
                } catch (error) {
                    console.error(chalk.red(`✗ Error running ${scraper.name} scraper:`), error);
                }
            }
        }
    },
    {
        name: 'all',
        description: 'Run all scrapers sequentially (excluding image download)',
        action: async () => {
            // Define a specific order of scrapers to run
            const scrapersInOrder = [
                baseScrapers.find(s => s.name === 'sets'),
                baseScrapers.find(s => s.name === 'cards'),
                baseScrapers.find(s => s.name === 'merge-sets'),
                ...baseScrapers.filter(s => 
                    s.name !== 'sets' && 
                    s.name !== 'cards' && 
                    s.name !== 'merge-sets' && 
                    s.name !== 'download-images'
                )
            ].filter(Boolean);

            for (const scraper of scrapersInOrder) {
                if (!scraper) continue;
                console.log(chalk.yellow(`Running ${scraper.name} scraper...`));
                try {
                    await scraper.action();
                    console.log(chalk.green(`✓ ${scraper.name} scraper completed successfully!`));
                } catch (error) {
                    console.error(chalk.red(`✗ Error running ${scraper.name} scraper:`), error);
                }
            }
        }
    },
    ...baseScrapers
];

async function main() {
    console.log(chalk.blue.bold('=== Pokémon Data Scraper CLI ==='));
    console.log(chalk.gray('Select a scraper to run:'));

    const choice = await select({
        message: 'Choose a scraper to run:',
        choices: scrapers.map(scraper => ({
            name: `${chalk.green(scraper.name)} - ${scraper.description}`,
            value: scraper.name,
        })),
    });

    const selectedScraper = scrapers.find(scraper => scraper.name === choice);

    if (selectedScraper) {
        if (selectedScraper.name === 'all') {
            await selectedScraper.action();
        } else {
            console.log(chalk.yellow(`Running ${selectedScraper.name} scraper...`));
            try {
                await selectedScraper.action();
                console.log(chalk.green(`✓ ${selectedScraper.name} scraper completed successfully!`));
            } catch (error) {
                console.error(chalk.red(`✗ Error running ${selectedScraper.name} scraper:`), error);
            }
        }
    } else {
        console.error(chalk.red('Invalid selection'));
    }
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});
