import { getCards, getArtists, getSets, getPrices } from '$helpers/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get layout data which contains default SEO values
	const layoutData = await parent();

	const [allCards, artists, sets, prices] = await Promise.all([
		getCards(),
		getArtists(),
		getSets(),
		getPrices()
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
