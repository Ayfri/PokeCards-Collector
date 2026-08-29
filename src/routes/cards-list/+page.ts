import { browser } from '$app/environment';
import type { CardsListPayload } from '../api/cards-list/+server';
import type { PageLoad } from './$types';

/**
 * The grid payload sits behind an endpoint rather than in `+page.server.ts` because that load reads `?set=`, so
 * SvelteKit reran it - and re-sent all 23546 cards - on every set filter change. Fetching it from a universal load
 * and holding the promise in module scope means the catalogue crosses the wire once per session whatever the
 * filters do, and keeps it out of the document instead of streaming 17 MB of JSON into every first render.
 */
let cachedGrid: Promise<CardsListPayload> | null = null;

export const load: PageLoad = ({ data, fetch }) => {
	// On the server the grid is never rendered anyway - `VirtualGrid` measures itself before it draws a single tile.
	if (!browser) return { ...data, streamed: { grid: new Promise<CardsListPayload>(() => {}) } };

	cachedGrid ??= fetch('/api/cards-list').then(response => response.json() as Promise<CardsListPayload>);
	return { ...data, streamed: { grid: cachedGrid } };
};
