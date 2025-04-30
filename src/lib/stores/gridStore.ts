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

	// Define fixed gaps (can be adjusted if needed)
	const gapX = 15; // Fixed horizontal gap
	const gapY = 20; // Fixed vertical gap

	// Calculate available width (consider some padding/margin)
	const availableWidth = clientWidth * 0.96; 

	let widthPerCard: number;
	let heightPerCard: number;
	let cardsPerRow: number;

	if (clientWidth < 768) {
		// Mobile: Force 2 cards per row
		cardsPerRow = 2;
		// Calculate width needed for 2 cards + 1 gap
		widthPerCard = Math.max(100, Math.floor((availableWidth - gapX) / cardsPerRow)); // Ensure a minimum width
		heightPerCard = Math.floor(widthPerCard / baseRatio);
	} else {
		// Desktop: Use selected size
		widthPerCard = sizes[size]?.width || sizes[defaultSize].width; // Use defaultSize if size is invalid
		heightPerCard = Math.floor(widthPerCard / baseRatio);
		// Calculate how many cards can fit based on selected size
		cardsPerRow = Math.max(
			1,
			Math.floor(availableWidth / (widthPerCard + gapX))
		);
	}

	return {
		width: widthPerCard,
		height: heightPerCard,
		gapX: gapX,
		gapY: gapY,
		cardsPerRow: cardsPerRow
	};
} 