import { getSets } from '$helpers/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get layout data which contains default SEO values
	const layoutData = await parent();
	
	// Get all sets
	const sets = await getSets();
	
	// Define page-specific SEO data
	const pageSeoData = {
		title: 'Pokémon TCG Sets - PokéStore',
		description: 'Browse all Pokémon Trading Card Game sets in chronological order, view set information including release dates and card counts.'
	};
	
	return {
		...layoutData,
		sets,
		...pageSeoData
	};
}; 