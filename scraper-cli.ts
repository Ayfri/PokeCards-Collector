#!/usr/bin/env node

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { downloadAllImages } from './src/scrapers/download_images.js';
import { fetchAndSaveAllCards } from './src/scrapers/card_fetcher.js';
import { fetchHoloCards } from './src/scrapers/holo_scraper.js';
import { fetchPokemons } from './src/scrapers/pokemon_scraper.js';
import { fetchPokemonTypes } from './src/scrapers/types_scraper.js';
import { fetchSets } from './src/scrapers/set_fetcher.js';
import { getCardMasks } from './src/scrapers/foil_scraper.js';
import { fetchTCGCollectorCards } from './src/scrapers/jap_cards_scraper.js';
import { fetchJapaneseSets } from './src/scrapers/jap_sets_scraper.js';

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
        description: 'Download low-res card images based on cards-full.json',
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
			const { uploadFileForCli, filesToUpload } = await import('./src/scrapers/upload.js');
			const path = await import('node:path');
			for (const filePath of filesToUpload) {
				const objectName = path.basename(filePath);
				try {
					await uploadFileForCli(filePath, objectName, { env: process.env as Record<string, any>, contentType: 'application/json' });
					console.log(`Uploaded: ${filePath}`);
				} catch (error) {
					console.error(`Failed to upload: ${filePath}`, error);
				}
			}
			console.log('All uploads complete!');
		} catch (error) {
			console.error('Upload failed:', error);
		}
	}
};

// Supabase upload tasks
const supabaseUploadTasks: ScraperOption[] = [
	{
		name: 'supabase-all',
		description: 'Upload all JSON data to Supabase (types, pokemons, sets, cards, jp-cards, prices)',
		action: async () => {
			const { uploadAllData } = await import('./src/scrapers/supabase_uploader.js');
			await uploadAllData();
		}
	},
	{
		name: 'supabase-types',
		description: 'Upload Pokémon types to Supabase',
		action: async () => {
			const { uploadTypes } = await import('./src/scrapers/supabase_uploader.js');
			await uploadTypes();
		}
	},
	{
		name: 'supabase-pokemons',
		description: 'Upload Pokémon data to Supabase',
		action: async () => {
			const { uploadPokemons } = await import('./src/scrapers/supabase_uploader.js');
			await uploadPokemons();
		}
	},
	{
		name: 'supabase-sets',
		description: 'Upload card sets to Supabase',
		action: async () => {
			const { uploadSets } = await import('./src/scrapers/supabase_uploader.js');
			await uploadSets();
		}
	},
	{
		name: 'supabase-jp-sets',
		description: 'Upload Japanese card sets to Supabase',
		action: async () => {
			const { uploadJapaneseSets } = await import('./src/scrapers/supabase_uploader.js');
			await uploadJapaneseSets();
		}
	},
	{
		name: 'supabase-cards',
		description: 'Upload cards to Supabase',
		action: async () => {
			const { uploadCards } = await import('./src/scrapers/supabase_uploader.js');
			await uploadCards();
		}
	},
	{
		name: 'supabase-jp-cards',
		description: 'Upload Japanese cards to Supabase',
		action: async () => {
			const { uploadJapaneseCards } = await import('./src/scrapers/supabase_uploader.js');
			await uploadJapaneseCards();
		}
	},
	{
		name: 'supabase-prices',
		description: 'Upload prices to Supabase',
		action: async () => {
			const { uploadPrices } = await import('./src/scrapers/supabase_uploader.js');
			await uploadPrices();
		}
	}
];

baseScrapers.push(uploadFilesTask);
baseScrapers.push(...supabaseUploadTasks);
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
                    s.name !== 'download-images' &&
                    !s.name.startsWith('supabase')
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
    {
        name: 'supabase',
        description: 'Choose specific Supabase upload tasks',
        action: async () => {
            const supabaseChoice = await select({
                message: 'Choose a Supabase upload task:',
                choices: supabaseUploadTasks.map(scraper => ({
                    name: `${chalk.blue(scraper.name)} - ${scraper.description}`,
                    value: scraper.name,
                })),
            });

            const selectedSupabaseScraper = supabaseUploadTasks.find(scraper => scraper.name === supabaseChoice);
            if (selectedSupabaseScraper) {
                console.log(chalk.yellow(`Running ${selectedSupabaseScraper.name}...`));
                try {
                    await selectedSupabaseScraper.action();
                    console.log(chalk.green(`✓ ${selectedSupabaseScraper.name} completed successfully!`));
                } catch (error) {
                    console.error(chalk.red(`✗ Error running ${selectedSupabaseScraper.name}:`), error);
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
