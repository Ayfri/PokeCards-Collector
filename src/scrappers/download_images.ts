import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import type { Card } from '../types.js';
import { CARDS } from './files.js';

const BATCH_SIZE = 60;
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second delay (can be adjusted)
const DOWNLOAD_HIGH_RES = false; // <<< Set to true to download high-resolution images
const OUTPUT_DIR = path.join(process.cwd(), DOWNLOAD_HIGH_RES ? 'images_hires' : 'images'); // Output directory based on resolution

interface CardInfo {
	imageUrl: string; // URL for the image (high or low res)
	number: number;
}

/**
 * Reads card metadata from the JSON file and generates image URLs based on DOWNLOAD_HIGH_RES.
 */
async function readCardMetadataFromJson(): Promise<CardInfo[]> {
	console.log(`Reading card data from ${CARDS}...`);
	try {
		const fileContent = await fs.readFile(CARDS, 'utf-8');
		const allCardsRaw = JSON.parse(fileContent).flat() as Card[];

		const cardInfos: CardInfo[] = allCardsRaw
			.map((card) => {
				if (!card || !card.image) { // Ensure card.id exists
					console.warn(`Skipping card due to missing id or image: ${JSON.stringify(card)}`);
					return null;
				}

				let imageUrl: string;
				const originalImageUrl = card.image;

				if (DOWNLOAD_HIGH_RES) {
					// Use the original URL, assuming it's high-res (_hires.png)
					if (!originalImageUrl.endsWith('_hires.png')) {
						console.warn(`Expected high-res URL ending in '_hires.png' for card ${card.id}, but got: ${originalImageUrl}. Skipping.`);
						return null; // Skip if the format isn't as expected for high-res
					}
					imageUrl = originalImageUrl;
				} else {
					// Attempt to convert high-res URL to low-res URL
					const lowResImageUrl = originalImageUrl.replace('_hires.png', '.png');

					// Check if replacement happened or if it was already low-res
					if (lowResImageUrl === originalImageUrl && originalImageUrl.includes('_hires.png')) {
						console.warn(`Could not convert URL to low-res for card ${card.id}: ${originalImageUrl}. Skipping.`);
						return null; // Skip if conversion failed but looked like it should work
					} else if (!lowResImageUrl.endsWith('.png')) {
						console.warn(`Skipping card ${card.id} due to unexpected image URL format for low-res: ${originalImageUrl}. Skipping.`);
						return null; // Skip if the URL doesn't end with .png after potential replacement
					}
					imageUrl = lowResImageUrl;
				}

				return {
					imageUrl: imageUrl,
					number: card.id, // Store the card ID
				};
			})
			.filter((info) => info !== null); // Filter out null entries

		console.log(`Successfully read and processed ${cardInfos.length} cards for ${DOWNLOAD_HIGH_RES ? 'high' : 'low'}-resolution download.`);
		return cardInfos;

	} catch (error) {
		console.error(`Failed to read or parse JSON file ${CARDS}:`, error);
		return []; // Return empty array on error
	}
}

/**
 * Downloads and optimizes a batch of images using sharp.
 * @param batch - Array of CardInfo objects (max BATCH_SIZE).
 */
async function downloadImageBatch(batch: CardInfo[]): Promise<void> {
	const processPromises = batch.map(async (cardInfo) => {
		// Generate filename
		const setName = cardInfo.imageUrl.split('/').at(-2);
		const cardName = cardInfo.imageUrl.split('/').at(-1);
		if (!setName || !cardName) {
			console.warn(`Skipping card due to missing set name or card name: ${cardInfo.imageUrl}`);
			return;
		}
		const filename = `${setName}/${cardName}`;
		const outputPath = path.join(OUTPUT_DIR, filename);

		await fs.mkdir(path.join(OUTPUT_DIR, setName), { recursive: true });

		try {
			// Check if image already exists
			await fs.access(outputPath);
			// console.log(`Image already exists, skipping: ${filename}`);
			return; // Skip download and optimization if file exists
		} catch {
			// File doesn't exist, proceed with download and optimization
		}

		let imageBuffer: ArrayBuffer | null = null;

		// --- Download Phase ---
		try {
			const response = await fetch(cardInfo.imageUrl);
			if (!response.ok) {
				if (response.status === 404) {
					console.warn(`Image not found (404): ${cardInfo.imageUrl} (Card ID: ${cardInfo.number})`);
				} else {
					console.error(`HTTP error! Status: ${response.status} for ${cardInfo.imageUrl} (Card ID: ${cardInfo.number})`);
				}
				return; // Skip processing if download failed
			}
			imageBuffer = await response.arrayBuffer();
		} catch (error) {
			console.error(`Failed to download ${cardInfo.imageUrl} (Card ID: ${cardInfo.number}):`, error);
			return; // Skip processing if download failed
		}

		// --- Optimization/Saving Phase ---
		if (imageBuffer) {
			try {
				// Optimization settings (can be adjusted)
				// For high-res, maybe less aggressive compression? For now, using the same.
				await sharp(Buffer.from(imageBuffer))
					.png({
						compressionLevel: 9,
						adaptiveFiltering: true,
						quality: DOWNLOAD_HIGH_RES ? 100 : 90, // Slightly adjust quality based on res? PNG quality is complex.
					})
					.toFile(outputPath);
				// console.log(`Downloaded and saved: ${filename}`);
			} catch (error) {
				console.error(`Failed to process image ${filename} from ${cardInfo.imageUrl}:`, error);
				// Fallback logic removed for brevity, can be added back if needed
			}
		}
	});

	// Wait for all downloads and optimizations in the batch to settle
	await Promise.allSettled(processPromises);
}

/**
 * Main function to orchestrate reading metadata and downloading/optimizing images.
 * Export this function so it can be used by the CLI.
 */
export async function downloadAllImages() {
	const resolution = DOWNLOAD_HIGH_RES ? 'high-resolution' : 'low-resolution';
	console.log(`Starting ${resolution} image download process. Output directory: ${OUTPUT_DIR}`);

	// 1. Ensure output directory exists
	try {
		await fs.mkdir(OUTPUT_DIR, { recursive: true });
		console.log(`Output directory "${OUTPUT_DIR}" ensured.`);
	} catch (error) {
		console.error(`Failed to create output directory "${OUTPUT_DIR}":`, error);
		return; // Stop if directory cannot be created
	}

	// 2. Read card metadata from JSON
	const allCards = await readCardMetadataFromJson();
	if (allCards.length === 0) {
		console.log('No card metadata found or processed from JSON. Exiting.');
		return;
	}

	// 3. Download and optimize images in batches
	console.log(`Starting ${resolution} image download and processing in batches of ${BATCH_SIZE}...`);
	let downloadedCount = 0;
	const totalCards = allCards.length;
	for (let i = 0; i < totalCards; i += BATCH_SIZE) {
		const batch = allCards.slice(i, i + BATCH_SIZE);
		const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(totalCards / BATCH_SIZE);

		console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} images)...`);
		await downloadImageBatch(batch);
		downloadedCount += batch.length; // Approximation

		if (i + BATCH_SIZE < totalCards) {
			console.log(`Batch ${batchNumber} finished. Processed approx ${downloadedCount}/${totalCards} cards. Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s...`);
			await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
		}
	}

	console.log(`${resolution.charAt(0).toUpperCase() + resolution.slice(1)} image download process finished. Processed approx ${downloadedCount}/${totalCards} cards.`);
}
