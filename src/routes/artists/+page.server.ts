import { getArtists } from '$helpers/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get layout data which contains default SEO values
	const { allCards, sets, prices, ...layoutData } = await parent();

	const [artists] = await Promise.all([
		getArtists()
	]);

	// Define page-specific SEO data
	const pageSeoData: Partial<typeof layoutData> = {
		title: 'Artists',
		description: 'Browse all Pokémon Trading Card Game artists, view their cards and explore their artwork.'
	};

	return {
		...layoutData,
		allCards,
		artists,
		sets,
		prices,
		...pageSeoData
	};
};
