import { browser } from '$app/env';
import { cachedJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/** The set's cards come from an endpoint like the other grids, so the page document holds the checklist and not the card objects twice. */
export const load: PageLoad = ({ data, fetch }) => {
	/** On the server the promise never resolves: the grid does not render there, since `VirtualGrid` measures itself before drawing a tile. */
	if (!browser) return { ...data, streamed: { grid: new Promise<GridPayload>(() => {}) } };

	return { ...data, streamed: { grid: cachedJson<GridPayload>(fetch, `/api/set-cards?language=${data.catalogueLanguage}&set=${encodeURIComponent(data.set.setId)}`) } };
};
