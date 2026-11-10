import { ogImage } from '#helpers/og-image.ts';
import type { LayoutServerLoad } from './$types';
import { getUserWishlist } from '#lib/services/wishlists.ts';
import { getUserCollection } from '#lib/services/collections.ts';
import type { UserCollection, UserWishlist } from '#lib/types.js';

/**
 * The catalogue is deliberately not returned here. Everything a layout load returns is serialized into the document,
 * so returning `cards` and `prices` put 23546 cards and 19819 prices (a 24 MB document) on every page, even those
 * that only needed them server-side. The English sets stay out too (202 of them, 53 kB on every document): the pages that draw them return them from their own load.
 * Page loads call `getCards()` / `getPrices()` / `getSets()` themselves; `cachedTable` memoizes each, so the whole-table read still happens once per isolate.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	let wishlistItems: UserWishlist[] = [];
	let collectionItems: UserCollection[] = [];

	if (locals.profile) {
		const username = locals.profile.username;
		/** `allSettled` so a failing wishlist query does not also lose the user's collection. */
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
		user: locals.user,
		profile: locals.profile,
		wishlistItems,
		collectionItems,
		/** SEO defaults. `page.data` merges layout and page data, so a page only returns the fields it changes and the rest fall back to these. */
		title: 'PokéCards-Collector',
		description: 'Explore the Pokémon TCG universe. Discover the latest set, check out the prices of the rarest cards, and manage your collection.',
		image: ogImage({ kind: 'page', name: 'home' }, 'PokéCards-Collector, a Pokémon TCG catalogue and collection tracker: its card count in English, Japanese and French, and three of the most valuable cards'),
	};
};
