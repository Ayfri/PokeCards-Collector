import { BY_GRID } from '#helpers/catalogues.ts';
import type { LayoutServerLoad } from './$types';
import { getSets } from '#helpers/supabase-data.ts';

/** Depends on the grid only, not on `?set=`: a set filter change never reruns it, and `/japan` to `/france` loads the other catalogue's sets. */
export const load: LayoutServerLoad = async ({ params }) => {
	const sets = await getSets(BY_GRID[params.grid].language);
	return { sets: sets.toSorted((a, b) => a.name.localeCompare(b.name)) };
};
