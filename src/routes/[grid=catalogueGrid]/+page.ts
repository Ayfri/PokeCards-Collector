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
	/** On the server the promise never resolves: the grid does not render there, since `VirtualGrid` measures itself before drawing a tile. */
	if (!browser) return { ...data, streamed: { cardData: new Promise<GridPayload>(() => {}) } };

	return { ...data, streamed: { cardData: cachedJson<GridPayload>(fetch, `/api/${params.grid}-cards`) } };
};
