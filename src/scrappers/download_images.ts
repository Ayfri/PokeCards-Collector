import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import type { Card } from '../types.js';
import { CARDS } from './files.js';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second delay (can be adjusted)
const DOWNLOAD_HIGH_RES = true; // <<< Set to true to download high-resolution images
const OPTIMIZE_EXISTING_ONLY = false; // <<< Set to true to only optimize existing local images
const OUTPUT_DIR = path.join(process.cwd(), 'images'); // Output directory

interface CardInfo {
	imageUrl: string; // URL for the image (high or low res)
	number: number; // Keep the card number/id
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
					number: parseInt(card.numero),
				};
			})
			.filter((info) => info !== null); // Filter out null entries with type guard

		console.log(`Successfully read and processed ${cardInfos.length} cards for ${DOWNLOAD_HIGH_RES ? 'high' : 'low'}-resolution processing.`);
		return cardInfos;

	} catch (error) {
		console.error(`Failed to read or parse JSON file ${CARDS}:`, error);
		return []; // Return empty array on error
	}
}

/**
 * Optimizes an image buffer using Sharp and saves it to the specified path.
 * @param imageBuffer The image data buffer.
 * @param outputPath The path to save the optimized image.
 * @param filename The filename for logging purposes.
 */
async function optimizeAndSaveImage(imageBuffer: Buffer, outputPath: string, filename: string): Promise<void> {
	try {
		await sharp(imageBuffer)
			.png({
				compressionLevel: 9,
				adaptiveFiltering: true,
				palette: true,
				quality: DOWNLOAD_HIGH_RES ? 100 : 90,
			})
			.toFile(outputPath);
		// console.log(`Optimized and saved: ${filename}`);
	} catch (error) {
		console.error(`Failed to optimize or save image ${filename}:`, error);
	}
}

/**
 * Downloads and/or optimizes a batch of images.
 * If OPTIMIZE_EXISTING_ONLY is true, it only optimizes existing files.
 * Otherwise, it downloads missing files and optimizes them.
 * @param batch - Array of CardInfo objects (max BATCH_SIZE).
 */
async function downloadOrOptimizeImageBatch(batch: CardInfo[]): Promise<void> {
	const processPromises = batch.map(async (cardInfo) => {
		// Generate filename (keeping your structure)
		const setName = cardInfo.imageUrl.split('/').at(-2);
		const cardName = cardInfo.imageUrl.split('/').at(-1);
		if (!setName || !cardName) {
			console.warn(`Skipping card due to missing set name or card name from URL: ${cardInfo.imageUrl} (Card Number: ${cardInfo.number})`);
			return;
		}
		const filename = `${setName}/${cardName}`; // Keep the folder/file structure
		const outputDirForSet = path.join(OUTPUT_DIR, setName);
		const outputPath = path.join(outputDirForSet, cardName);

		// Ensure the specific set directory exists (keeping your change)
		try {
			await fs.mkdir(outputDirForSet, { recursive: true });
		} catch (error) {
			console.error(`Failed to create directory ${outputDirForSet}:`, error);
			return; // Skip card if directory creation fails
		}

		let imageBuffer: Buffer | null = null;
		let fileExists = false;

		// --- Check File Existence ---
		try {
			await fs.access(outputPath);
			fileExists = true;
			// console.log(`Image found locally: ${filename}`);
		} catch {
			// File doesn't exist
			if (OPTIMIZE_EXISTING_ONLY) {
				console.warn(`Optimize only mode: Image not found locally, skipping: ${filename}`);
				return; // Skip if in optimize-only mode and file is missing
			}
			// console.log(`Image not found locally, proceeding with download: ${filename}`);
		}

		// --- Processing Logic ---
		if (fileExists && OPTIMIZE_EXISTING_ONLY) {
			// Mode: Optimize existing only, and file exists
			console.log(`Optimizing existing image: ${filename}`);
			try {
				imageBuffer = await fs.readFile(outputPath);
				await optimizeAndSaveImage(imageBuffer, outputPath, filename); // Optimize the existing file
			} catch (readError) {
				console.error(`Failed to read existing file ${filename} for optimization:`, readError);
			}
		} else if (!fileExists && !OPTIMIZE_EXISTING_ONLY) {
			// Mode: Download and optimize, and file does not exist
			// --- Download Phase ---
			try {
				const response = await fetch(cardInfo.imageUrl);
				if (!response.ok) {
					if (response.status === 404) {
						console.warn(`Image not found (404): ${cardInfo.imageUrl} (Card Number: ${cardInfo.number})`);
					} else {
						console.error(`HTTP error! Status: ${response.status} for ${cardInfo.imageUrl} (Card Number: ${cardInfo.number})`);
					}
					return; // Skip processing if download failed
				}
				const arrayBuffer = await response.arrayBuffer();
				imageBuffer = Buffer.from(arrayBuffer); // Convert to Buffer
			} catch (error) {
				console.error(`Failed to download ${cardInfo.imageUrl} (Card Number: ${cardInfo.number}):`, error);
				return; // Skip processing if download failed
			}

			// --- Optimization Phase (after download) ---
			if (imageBuffer) {
				await optimizeAndSaveImage(imageBuffer, outputPath, filename);
			}
		} else if (fileExists && !OPTIMIZE_EXISTING_ONLY) {
			// Mode: Download and optimize, but file already exists - skip
			// console.log(`Image already exists, skipping download/optimization: ${filename}`);
			return;
		}
		// The case (!fileExists && OPTIMIZE_EXISTING_ONLY) is handled by the return inside the catch block.
	});

	// Wait for all operations in the batch to settle
	await Promise.allSettled(processPromises);
}

/**
 * Main function to orchestrate reading metadata and processing images.
 * Export this function so it can be used by the CLI.
 */
export async function downloadAllImages() {
	const mode = OPTIMIZE_EXISTING_ONLY ? 'Optimize existing' : (DOWNLOAD_HIGH_RES ? 'High-resolution download' : 'Low-resolution download');
	console.log(`Starting ${mode} process. Output directory: ${OUTPUT_DIR}`);

	// 1. Ensure base output directory exists (individual set dirs created in batch)
	try {
		await fs.mkdir(OUTPUT_DIR, { recursive: true });
		console.log(`Base output directory "${OUTPUT_DIR}" ensured.`);
	} catch (error) {
		console.error(`Failed to create base output directory "${OUTPUT_DIR}":`, error);
		return; // Stop if directory cannot be created
	}

	// 2. Read card metadata from JSON
	const allCards = await readCardMetadataFromJson();
	if (allCards.length === 0) {
		console.log('No card metadata found or processed from JSON. Exiting.');
		return;
	}

	// 3. Process images in batches
	console.log(`Starting image processing in batches of ${BATCH_SIZE}...`);
	let processedCount = 0;
	const totalCards = allCards.length;
	for (let i = 0; i < totalCards; i += BATCH_SIZE) {
		const batch = allCards.slice(i, i + BATCH_SIZE);
		const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(totalCards / BATCH_SIZE);

		console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} images)...`);
		// Use the updated batch function name
		await downloadOrOptimizeImageBatch(batch);
		processedCount += batch.length; // Approximation

		if (i + BATCH_SIZE < totalCards) {
			console.log(`Batch ${batchNumber} finished. Processed approx ${processedCount}/${totalCards} cards. Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s...`);
			await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
		}
	}

	console.log(`${mode} process finished. Processed approx ${processedCount}/${totalCards} cards.`);
}
