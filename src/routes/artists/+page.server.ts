import { getCards, getArtists } from '$helpers/data';
import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get layout data which contains default SEO values
	const layoutData = await parent();
	
	// Get all cards and artists
	const allCards: FullCard[] = await getCards();
	const artists = await getArtists();
	
	// Define page-specific SEO data
	const pageSeoData = {
		title: 'Pokémon TCG Artists - PokéStore',
		description: 'Browse all Pokémon Trading Card Game artists, view their cards and explore their artwork.'
	};
	
	return {
		...layoutData,
		allCards,
		artists,
		...pageSeoData
	};
}; 