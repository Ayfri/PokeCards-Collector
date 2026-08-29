import { getSets } from '$helpers/supabase-data';
import type { LayoutServerLoad } from './$types';
import { getUserWishlist } from '$lib/services/wishlists';
import { getUserCollection } from '$lib/services/collections';
import type { UserCollection, UserWishlist } from '$lib/types';

/**
 * The catalogue is deliberately absent here. Anything a layout load returns is serialized into the document for
 * the client, so streaming `cards` and `prices` from this level shipped 23546 cards and 19819 prices on every
 * page that needed them server-side - a 24 MB document. Page loads call `getCards()` / `getPrices()` themselves
 * instead; both are memoized by `cachedTable`, so the whole-table read still happens once per isolate.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	// Sets and the user's own rows are independent queries, so they overlap instead of running back to back.
	const setsPromise = getSets();

	let wishlistItems: UserWishlist[] = [];
	let collectionItems: UserCollection[] = [];

	if (locals.profile) {
		const username = locals.profile.username;
		// `allSettled` so a failing wishlist does not also cost the user their collection.
		const [wishlistResult, collectionResult] = await Promise.allSettled([
			getUserWishlist(username, locals.supabase),
			getUserCollection(username, locals.supabase)
		]);

		if (wishlistResult.status === 'fulfilled' && !wishlistResult.value.error) {
			wishlistItems = wishlistResult.value.data as UserWishlist[] || [];
		} else if (wishlistResult.status === 'rejected' || wishlistResult.value.error) {
			console.error('Error fetching wishlist in layout:', wishlistResult.status === 'rejected' ? wishlistResult.reason : wishlistResult.value.error);
		}

		if (collectionResult.status === 'fulfilled' && !collectionResult.value.error) {
			collectionItems = collectionResult.value.data as UserCollection[] || [];
		} else if (collectionResult.status === 'rejected' || collectionResult.value.error) {
			console.error('Error fetching collection in layout:', collectionResult.status === 'rejected' ? collectionResult.reason : collectionResult.value.error);
		}
	}

	return {
		sets: await setsPromise,
		user: locals.user,
		profile: locals.profile,
		wishlistItems,
		collectionItems,
		// SEO defaults every page load overrides. `page.data` merges layout and page data, so a page only restates
		// the fields it changes, and the ones it leaves out fall back to these.
		title: 'PokéCards-Collector',
		description: 'Explore the Pokémon TCG universe. Discover the latest set, check out the prices of the rarest cards, and manage your collection.',
		image: { alt: 'PokéCards-Collector, a Pokémon TCG catalogue and collection tracker', height: 630, url: '/og-image.png', width: 1200 },
	};
};
