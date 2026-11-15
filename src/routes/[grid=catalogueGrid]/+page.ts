import { gridJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/**
 * The grid payload comes from an endpoint, not `+page.server.ts`, because that load reads `?set=`: SvelteKit would
 * rerun it and re-send the whole catalogue with its prices on every set filter change.
 * The promises are held in module scope, one per grid, so each payload crosses the wire once per session whatever the filters do.
 */
export const load: PageLoad = ({ data, fetch, params }) => {
	/** A document request preloads this endpoint from the page head (`preloadPayload`), so the download starts with the document instead of after the scripts. */
	const payload = `/api/${params.grid}-cards`;

	return { ...data, grid: gridJson<GridPayload>(fetch, payload), payload };
};
