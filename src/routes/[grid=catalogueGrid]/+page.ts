import { browser } from '$app/env';
import { cachedJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/**
 * The grid payload comes from an endpoint, not `+page.server.ts`, because that load reads `?set=`: SvelteKit would
 * rerun it and re-send the whole catalogue with its prices on every set filter change.
 * The promises are held in module scope, one per grid, so each payload crosses the wire once per session whatever the filters do.
 */
export const load: PageLoad = ({ data, fetch, params }) => {
	/** The page preloads this endpoint from its head, so the download starts with the document instead of after the scripts. */
	const payload = `/api/${params.grid}-cards`;

	/** On the server the promise never resolves: the grid does not render there, since `VirtualGrid` measures itself before drawing a tile. */
	if (!browser) return { ...data, payload, streamed: { cardData: new Promise<GridPayload>(() => {}) } };

	return { ...data, payload, streamed: { cardData: cachedJson<GridPayload>(fetch, payload) } };
};
