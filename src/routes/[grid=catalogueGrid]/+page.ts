import { browser } from '$app/environment';
import type { CatalogueCardsPayload } from '../api/[grid=catalogueGrid]-cards/+server';
import type { PageLoad } from './$types';

/**
 * The grid payload sits behind an endpoint rather than in `+page.server.ts` because that load reads `?set=`, so
 * SvelteKit reran it - and re-sent the whole catalogue with its prices - on every set filter change.
 * Holding the promises in module scope, one per grid, means each crosses the wire once per session whatever the filters do.
 */
const cache = new Map<string, Promise<CatalogueCardsPayload>>();

export const load: PageLoad = ({ data, fetch, params }) => {
	// On the server the grid is never rendered anyway - `VirtualGrid` measures itself before it draws a single tile.
	if (!browser) return { ...data, streamed: { cardData: new Promise<CatalogueCardsPayload>(() => {}) } };

	let cardData = cache.get(params.grid);
	if (!cardData) {
		cardData = fetch(`/api/${params.grid}-cards`).then(response => response.json() as Promise<CatalogueCardsPayload>);
		cache.set(params.grid, cardData);
	}

	return { ...data, streamed: { cardData } };
};
