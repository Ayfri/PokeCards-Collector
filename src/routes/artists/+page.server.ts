import { getArtists } from '$helpers/supabase-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	// Await the streamed promises from parent
	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const sets = parentData.sets || []; // 'sets' is already resolved in parentData

	// Extract other necessary layout data (e.g., user, profile, default SEO)
	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title, // Parent's default title
		description: parentData.description, // Parent's default description
		image: parentData.image, // Parent's default image
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	// Fetch the list of artists for this page
	const [artists] = await Promise.all([
		getArtists()
	]);

	// Define page-specific SEO data
	const pageSeoData = {
		title: 'Artists - Pokémon TCG | PokéCards-Collector', // More specific title
		description: 'Browse all Pokémon Trading Card Game artists, view their cards, and explore their unique artwork styles.'
	};

	return {
		...layoutData,
		allCards, // Pass the resolved allCards
		artists,  // Pass the fetched artists list
		sets,     // Pass the resolved sets from parent
		prices,   // Pass the resolved prices from parent
		...pageSeoData
	};
};
