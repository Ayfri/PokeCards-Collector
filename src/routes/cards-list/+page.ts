import { browser } from '$app/env';
import { cachedJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/**
 * The grid payload comes from an endpoint, not `+page.server.ts`, because that load reads `?set=`: SvelteKit would
 * rerun it and re-send all 23546 cards on every set filter change. A universal load fetches it and holds the promise
 * in module scope, so the catalogue crosses the wire once per session whatever the filters do, and the first render
 * does not stream 17 MB of JSON into the document.
 */
export const load: PageLoad = ({ data, fetch }) => {
	/** The page preloads this endpoint from its head, so the download starts with the document instead of after the scripts. */
	const payload = '/api/cards-list';

	/** On the server the promise never resolves: the grid does not render there, since `VirtualGrid` measures itself before drawing a tile. */
	if (!browser) return { ...data, payload, streamed: { grid: new Promise<GridPayload>(() => {}) } };

	return { ...data, payload, streamed: { grid: cachedJson<GridPayload>(fetch, payload) } };
};
