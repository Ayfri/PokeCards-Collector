import { gridJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/**
 * The grid payload comes from an endpoint, not `+page.server.ts`, because that load reads `?set=`: SvelteKit would
 * rerun it and re-send all 23546 cards on every set filter change. A universal load fetches it and holds the promise
 * in module scope, so the catalogue crosses the wire once per session whatever the filters do, and the first render
 * does not stream 17 MB of JSON into the document.
 */
export const load: PageLoad = ({ data, fetch }) => {
	/** A document request preloads this endpoint from the page head (`preloadPayload`), so the download starts with the document instead of after the scripts. */
	const payload = '/api/cards-list';

	return { ...data, grid: gridJson<GridPayload>(fetch, payload), payload };
};
