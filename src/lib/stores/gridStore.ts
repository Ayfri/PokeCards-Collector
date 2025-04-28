import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Default card size corresponds to 'M' in the slider
const defaultSize = 1;

// Function to safely get the initial size from localStorage
function getInitialSize(): number {
	if (!browser) return defaultSize;
	const storedValue = localStorage.getItem('cardSize');
	if (storedValue) {
		const parsedValue = parseFloat(storedValue);
		// Check if the parsed value is one of the allowed sizes
		if ([0.66, 1, 2, 3].includes(parsedValue)) {
			return parsedValue;
		}
	}
	return defaultSize;
}

const initialSize = getInitialSize();

// Create the store for card size
export const cardSize = writable<number>(initialSize);

// Subscribe to changes only to update localStorage
if (browser) {
	cardSize.subscribe(value => {
		localStorage.setItem('cardSize', value.toString());
	});
}

interface Size {
    name: string;
    width: number;
}

export const sizes: Record<number, Size> = {
    0.75: { name: 'S', width: 180 },
    1: { name: 'M', width: 280 },
    2: { name: 'L', width: 380 },
    3: { name: 'XL', width: 500 }
};

// Helper function to get the card dimensions based on size
export function getCardDimensions(size: number, clientWidth: number) {
	// Standard width/height ratio for Pokemon cards
	const baseRatio = 2.5 / 3.5;

	// Get the fixed width for the selected size, default to M (180px)
	const widthPerCard = sizes[size]?.width || 180;

	// Calculate the corresponding fixed height based on the aspect ratio
	const heightPerCard = Math.floor(widthPerCard / baseRatio);

	// Define fixed gaps (can be adjusted if needed)
	const gapX = 15; // Fixed horizontal gap
	const gapY = 20; // Fixed vertical gap

	// Calculate how many cards can fit in the available clientWidth
	// Account for the width of the cards and the gaps between them
	const availableWidth = clientWidth * 0.98; // Use 98% of width to account for potential padding/margins
	const cardsPerRow = Math.max(
		1,
		Math.floor(availableWidth / (widthPerCard + gapX))
	);

	return {
		width: widthPerCard,     // Fixed width
		height: heightPerCard,   // Fixed height
		gapX: gapX,              // Fixed gapX
		gapY: gapY,              // Fixed gapY
		cardsPerRow: cardsPerRow // Calculated cards per row
	};
} 