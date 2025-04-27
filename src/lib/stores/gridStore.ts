import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Default card size - medium size (1 = small, 2 = medium, 3 = large)
const defaultSize = 2;

// Initialize from localStorage if available, otherwise use default
const initialSize = browser && localStorage.getItem('cardSize') 
    ? parseInt(localStorage.getItem('cardSize') || '2') 
    : defaultSize;

// Variables pour éviter trop d'événements pendant le dragging
let debounceTimer: number | null = null;
let lastEmittedValue = initialSize;

// Create the store
export const cardSize = writable<number>(initialSize);

// Subscribe to changes and update localStorage and dispatch event
if (browser) {
    cardSize.subscribe(value => {
        // Mettre à jour le localStorage immédiatement
        localStorage.setItem('cardSize', value.toString());
        
        // Éviter d'émettre trop d'événements pendant le dragging du slider
        // Si la valeur est identique ou si un timer est déjà en cours, on annule
        if (value === lastEmittedValue || debounceTimer) {
            clearTimeout(debounceTimer as any);
        }
        
        // Définir un nouveau timer pour émettre l'événement
        debounceTimer = window.setTimeout(() => {
            lastEmittedValue = value;
            debounceTimer = null;
            
            // Dispatcher un événement personnalisé que tout le monde peut écouter
            try {
                const event = new CustomEvent('grid-size-changed', {
                    detail: { size: value },
                    bubbles: true
                });
                window.dispatchEvent(event);
            } catch (error) {
                console.error('Failed to dispatch grid-size-changed event:', error);
            }
        }, 100) as any; // 100ms de debounce
    });
}

// Helper function to get the card dimensions based on size
export function getCardDimensions(size: number, clientWidth: number) {
    // Base width for a standard Pokemon card (constant)
    const baseRatio = 2.5/3.5; // width/height standard ratio for Pokemon cards
    
    // Direct control of cards per row based on slider position
    const cardsPerRow = {
        1: 5, // Small cards (5 per row)
        2: 4, // Medium cards (4 per row)
        3: 2  // Large cards (2 per row)
    };
    
    // Get the desired cards per row for this size
    const desiredCardsPerRow = cardsPerRow[size as keyof typeof cardsPerRow] || 4;
    
    // Calculate card width based on available space and desired cards per row
    // Account for gaps between cards - we use 4% of container width for all gaps combined
    const availableWidth = clientWidth * 0.96; // 96% of container width for cards
    const gapX = Math.max(10, Math.floor(clientWidth * 0.01)); // Gap is 1% of container width
    const totalGapsWidth = gapX * (desiredCardsPerRow - 1);
    const widthPerCard = Math.floor((availableWidth - totalGapsWidth) / desiredCardsPerRow);
    
    // Calculate height based on the card's aspect ratio
    const heightPerCard = Math.floor(widthPerCard / baseRatio);
    
    return {
        width: widthPerCard,
        height: heightPerCard,
        gapX: gapX,
        gapY: Math.max(15, Math.floor(gapX * 1.5)),
        cardsPerRow: desiredCardsPerRow
    };
} 