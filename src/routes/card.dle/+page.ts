import { browser } from '$app/environment';
import type { CardDleSuggestion } from '../api/card-dle/suggestions/+server';
import type { PageLoad } from './$types';

/** Held in module scope so coming back to the game reuses the list instead of re-fetching it. */
let cachedSuggestions: Promise<CardDleSuggestion[]> | null = null;

export const load: PageLoad = ({ data, fetch }) => {
	// The picker only exists once the player types, so the server has nothing to render from it.
	if (!browser) return { ...data, suggestions: Promise.resolve<CardDleSuggestion[]>([]) };

	cachedSuggestions ??= fetch('/api/card-dle/suggestions').then(response => response.json() as Promise<CardDleSuggestion[]>);
	return { ...data, suggestions: cachedSuggestions };
};
