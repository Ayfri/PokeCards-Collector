import { browser } from '$app/environment';
import type { JapanCardsPayload } from '../api/japan-cards/+server';
import type { PageLoad } from './$types';

/**
 * The grid payload sits behind an endpoint rather than in `+page.server.ts` because that load reads `?set=`, so
 * SvelteKit reran it - and re-sent the whole Japanese catalogue with its prices - on every set filter change.
 * Holding the promise in module scope means it crosses the wire once per session whatever the filters do.
 */
let cachedCardData: Promise<JapanCardsPayload> | null = null;

export const load: PageLoad = ({ data, fetch }) => {
	// On the server the grid is never rendered anyway - `VirtualGrid` measures itself before it draws a single tile.
	if (!browser) return { ...data, streamed: { cardData: new Promise<JapanCardsPayload>(() => {}) } };

	cachedCardData ??= fetch('/api/japan-cards').then(response => response.json() as Promise<JapanCardsPayload>);
	return { ...data, streamed: { cardData: cachedCardData } };
};
