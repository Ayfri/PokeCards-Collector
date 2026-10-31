import { browser } from '$app/environment';
import { cachedJson } from '$helpers/cached-json';
import type { CatalogueCardsPayload } from '../api/[grid=catalogueGrid]-cards/+server';
import type { PageLoad } from './$types';

/**
 * The grid payload sits behind an endpoint rather than in `+page.server.ts` because that load reads `?set=`, so
 * SvelteKit reran it - and re-sent the whole catalogue with its prices - on every set filter change.
 * Holding the promises in module scope, one per grid, means each crosses the wire once per session whatever the filters do.
 */
export const load: PageLoad = ({ data, fetch, params }) => {
	// On the server the grid is never rendered anyway - `VirtualGrid` measures itself before it draws a single tile.
	if (!browser) return { ...data, streamed: { cardData: new Promise<CatalogueCardsPayload>(() => {}) } };

	return { ...data, streamed: { cardData: cachedJson<CatalogueCardsPayload>(fetch, `/api/${params.grid}-cards`) } };
};
