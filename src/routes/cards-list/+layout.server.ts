import type { LayoutServerLoad } from './$types';
import { getSets } from '#helpers/catalogue-data.ts';

/** Reads nothing from the URL, so a set filter change never reruns it and the sets cross the wire once per visit, not once per `?set=`. */
export const load: LayoutServerLoad = async () => ({ sets: await getSets() });
