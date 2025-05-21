import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import type { Card } from '../types.js';
import { CARDS } from './files.js';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second delay (can be adjusted)
const DOWNLOAD_HIGH_RES = true; // <<< Set to true to download high-resolution images
const OPTIMIZE_EXISTING_ONLY = false; // <<< Set to true to only optimize existing local images
const OUTPUT_DIR = path.join(process.cwd(), 'static/images/cards'); // Output directory
const LOW_RES_WIDTH = 30; // Width for the low-resolution placeholder images

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
 * Optimizes an image buffer using Sharp, saves standard and low-res WebP versions.
 * @param imageBuffer The image data buffer.
 * @param baseOutputPath The base path for saving (directory + filename without extension).
 * @param baseFilename The base filename without extension for logging purposes.
 */
async function optimizeAndSaveImage(imageBuffer: Buffer, baseOutputPath: string, baseFilename: string): Promise<void> {
	const standardPath = `${baseOutputPath}.webp`;
	const lowResPath = `${baseOutputPath}_lowres.webp`;

	// Optimize and save standard resolution WebP
	try {
		await sharp(imageBuffer)
			.webp({
				quality: DOWNLOAD_HIGH_RES ? 95 : 85, // Higher quality for high-res source
				lossless: false,
			})
			.toFile(standardPath);
		// console.log(`Optimized and saved standard res: ${baseFilename}.webp`);
	} catch (error) {
		console.error(`Failed to optimize or save standard image ${baseFilename}.webp:`, error);
	}

	// Optimize and save low resolution WebP
	try {
		await sharp(imageBuffer)
			.resize({ width: LOW_RES_WIDTH }) // Resize to low width, height is auto
			.webp({
				quality: 70, // Lower quality for placeholder
				lossless: false,
			})
			.toFile(lowResPath);
		// console.log(`Optimized and saved low res: ${baseFilename}_lowres.webp`);
	} catch (error) {
		console.error(`Failed to optimize or save low-res image ${baseFilename}_lowres.webp:`, error);
	}
}

/**
 * Downloads and/or optimizes a batch of images.
 * If OPTIMIZE_EXISTING_ONLY is true, it only optimizes existing files (generating low-res if needed).
 * Otherwise, it downloads missing files and optimizes them (standard + low-res WebP).
 * @param batch - Array of CardInfo objects (max BATCH_SIZE).
 */
async function downloadOrOptimizeImageBatch(batch: CardInfo[]): Promise<void> {
	const processPromises = batch.map(async (cardInfo) => {
		// Generate base filename and paths
		const setName = cardInfo.imageUrl.split('/').at(-2);
		const originalCardName = cardInfo.imageUrl.split('/').at(-1); // e.g., xy1-1_hires.png or sv5-1.png

		if (!setName || !originalCardName) {
			console.warn(`Skipping card due to missing set name or card name from URL: ${cardInfo.imageUrl} (Card Number: ${cardInfo.number})`);
			return;
		}

		// Remove original extension (.png or _hires.png) to get base name
		const baseFilename = originalCardName.replace(/(_hires)?\.png$/, '');
		const outputDirForSet = path.join(OUTPUT_DIR, setName);
		const baseOutputPath = path.join(outputDirForSet, baseFilename); // Path without extension
		const standardWebpPath = `${baseOutputPath}.webp`;
		const lowResWebpPath = `${baseOutputPath}_lowres.webp`;

		// Ensure the specific set directory exists
		try {
			await fs.mkdir(outputDirForSet, { recursive: true });
		} catch (error) {
			console.error(`Failed to create directory ${outputDirForSet}:`, error);
			return; // Skip card if directory creation fails
		}

		let standardFileExists = false;
		let lowResFileExists = false;

		// --- Check File Existence ---
		try {
			await fs.access(standardWebpPath);
			standardFileExists = true;
		} catch { /* Standard file doesn't exist */ }
		try {
			await fs.access(lowResWebpPath);
			lowResFileExists = true;
		} catch { /* Low-res file doesn't exist */ }

		// --- Processing Logic ---
		if (OPTIMIZE_EXISTING_ONLY) {
			if (!standardFileExists) {
				console.warn(`Optimize only mode: Standard image not found locally, skipping: ${baseFilename}.webp`);
				return;
			}

			// If standard exists, ensure low-res also exists
			if (!lowResFileExists) {
				console.log(`Optimizing existing image to create missing low-res: ${baseFilename}_lowres.webp`);
				try {
					const imageBuffer = await fs.readFile(standardWebpPath); // Read the existing standard webp
					// Only generate low-res part
					await sharp(imageBuffer)
						.resize({ width: LOW_RES_WIDTH })
						.webp({ quality: 70, lossless: false })
						.toFile(lowResWebpPath);
					// console.log(`Generated missing low res: ${baseFilename}_lowres.webp`);
				} catch (readOrOptimizeError) {
					console.error(`Failed to read ${standardWebpPath} or generate low-res version for ${baseFilename}:`, readOrOptimizeError);
				}
			} else {
				// console.log(`Optimize only mode: Both standard and low-res exist, skipping: ${baseFilename}`);
			}
			return; // Finish processing for this card in optimize only mode

		} else { // --- Download and Optimize Mode ---
			if (standardFileExists) {
				// If standard exists, assume low-res should also exist from previous run or will be handled if missing
				// console.log(`Image already exists (standard WebP found), skipping download/optimization: ${baseFilename}.webp`);
				// Optionally: Add check here to generate low-res if standard exists but low-res doesn't
				if (!lowResFileExists) {
					console.log(`Standard exists, but low-res missing. Generating low-res for: ${baseFilename}_lowres.webp`);
					try {
						const imageBuffer = await fs.readFile(standardWebpPath);
						await sharp(imageBuffer)
							.resize({ width: LOW_RES_WIDTH })
							.webp({ quality: 70, lossless: false })
							.toFile(lowResWebpPath);
					} catch (error) {
						console.error(`Failed to generate missing low-res ${baseFilename}_lowres.webp:`, error);
					}
				}
				return;
			}

			// --- Download Phase (Standard file doesn't exist) ---
			let imageBuffer: Buffer | null = null;
			try {
				// console.log(`Downloading: ${cardInfo.imageUrl}`);
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
				await optimizeAndSaveImage(imageBuffer, baseOutputPath, baseFilename);
			}
		}
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
