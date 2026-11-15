import { gridJson } from '#helpers/utils.ts';
import type { GridPayload } from '#helpers/grid-payload.ts';
import type { PageLoad } from './$types';

/** The set's cards come from an endpoint like the other grids, so the page document holds the checklist and not the card objects twice. */
export const load: PageLoad = ({ data, fetch }) => ({
	...data,
	grid: gridJson<GridPayload>(fetch, `/api/set-cards?language=${data.catalogueLanguage}&set=${encodeURIComponent(data.set.setId)}`),
});
