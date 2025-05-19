import { getCards, getSets, getPrices } from '$helpers/data';
import type { LayoutServerLoad } from './$types';
import { getUserWishlist } from '$lib/services/wishlists';
import { getUserCollection } from '$lib/services/collections';
import type { UserWishlist } from '$lib/types';
import type { UserCollection } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Fetch sets directly, assuming it's fast and needed.
	const sets = await getSets();

	// Initialize with specific types
	let wishlistItems: UserWishlist[] = [];
	let collectionItems: UserCollection[] = [];

	// If user is logged in (profile exists in locals), fetch their data
	if (locals.profile) {
		const username = locals.profile.username;
		// Use Promise.allSettled to fetch both concurrently and handle potential errors individually
		const [wishlistResult, collectionResult] = await Promise.allSettled([
			getUserWishlist(username),
			getUserCollection(username)
		]);

		if (wishlistResult.status === 'fulfilled' && !wishlistResult.value.error) {
			// Ensure data conforms to UserWishlist[]
			wishlistItems = wishlistResult.value.data as UserWishlist[] || [];
		} else if (wishlistResult.status === 'rejected' || wishlistResult.value.error) {
			console.error('Error fetching wishlist in layout:', wishlistResult.status === 'rejected' ? wishlistResult.reason : wishlistResult.value.error);
		}

		if (collectionResult.status === 'fulfilled' && !collectionResult.value.error) {
			// Ensure data conforms to UserCollection[]
			collectionItems = collectionResult.value.data as UserCollection[] || [];
		} else if (collectionResult.status === 'rejected' || collectionResult.value.error) {
			console.error('Error fetching collection in layout:', collectionResult.status === 'rejected' ? collectionResult.reason : collectionResult.value.error);
		}
	}

	return {
		streamed: {
			allCards: getCards(), // Return promise
			prices: getPrices(),   // Return promise
		},
		sets,                 // Resolved sets
		user: locals.user,
		profile: locals.profile,
		// Pass fetched user-specific data (or empty arrays)
		wishlistItems,
		collectionItems,
		// Default SEO values (can be overridden by page loads)
		title: "PokéCards-Collector",
		description: "Explore the Pokémon TCG universe. Discover the latest set, check out the prices of the rarest cards, and manage your collection.",
		image: { url: "/images/og-image.png", alt: "PokéCards-Collector" },
	};
};
