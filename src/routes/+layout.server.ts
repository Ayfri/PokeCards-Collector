import { getCards, getSets, getPrices } from '$helpers/supabase-data';
import type { LayoutServerLoad } from './$types';
import { getUserWishlist } from '$lib/services/wishlists';
import { getUserCollection } from '$lib/services/collections';
import type { FullCard, PriceData, UserWishlist } from '$lib/types';
import type { UserCollection } from '$lib/types';

/**
 * Routes whose load reads `streamed.allCards` / `streamed.prices`. Every other route paid for the whole card
 * and price tables without ever touching them, because the promises start executing the moment they are created.
 */
const ROUTES_NEEDING_CARDS = new Set([
	'/',
	'/artists',
	'/binder',
	'/card.dle',
	'/card/[cardCode]',
	'/cards-list',
	'/collection/[user]',
	'/guess-the-price',
	'/profile/[user]',
	'/sets',
	'/users',
	'/wishlist/[user]',
]);

export const load: LayoutServerLoad = async ({ locals, route }) => {
	// Sets and the user's own rows are independent queries, so they overlap instead of running back to back.
	const setsPromise = getSets();

	// Initialize with specific types
	let wishlistItems: UserWishlist[] = [];
	let collectionItems: UserCollection[] = [];

	// If user is logged in (profile exists in locals), fetch their data
	if (locals.profile) {
		const username = locals.profile.username;
		// Use Promise.allSettled to fetch both concurrently and handle potential errors individually
		const [wishlistResult, collectionResult] = await Promise.allSettled([
			getUserWishlist(username, locals.supabase),
			getUserCollection(username, locals.supabase)
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

	const sets = await setsPromise;
	const needsCards = route.id !== null && ROUTES_NEEDING_CARDS.has(route.id);

	return {
		streamed: {
			allCards: needsCards ? getCards() : Promise.resolve([] as FullCard[]),
			prices: needsCards ? getPrices() : Promise.resolve({} as Record<string, PriceData>),
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
