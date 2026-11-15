import { ogImage } from '#helpers/og-image.ts';
import type { LayoutServerLoad } from './$types';
import { getUserWishlist } from '#lib/services/wishlists.ts';
import { getUserCollection } from '#lib/services/collections.ts';

/**
 * The catalogue is deliberately not returned here. Everything a layout load returns is serialized into the document,
 * so returning `cards` and `prices` put 23546 cards and 19819 prices (a 24 MB document) on every page, even those
 * that only needed them server-side. The English sets stay out too (202 of them, 53 kB on every document): the pages that draw them return them from their own load.
 * Page loads call `getCards()` / `getPrices()` / `getSets()` themselves; `catalogueObject` memoizes each, so the whole-table read still happens once per isolate.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	/** The services never reject, so a failing wishlist query does not also lose the user's collection: each failure only empties its own list. */
	const [wishlist, collection] = locals.profile
		? await Promise.all([getUserWishlist(locals.profile.username, locals.supabase), getUserCollection(locals.profile.username, locals.supabase)])
		: [];
	if (wishlist?.error) console.error('Error fetching wishlist in layout:', wishlist.error);
	if (collection?.error) console.error('Error fetching collection in layout:', collection.error);
	const wishlistCodes = wishlist?.data?.map(({ card_code }) => card_code) ?? [];
	const collectionCodes = collection?.data?.map(({ card_code }) => card_code) ?? [];

	return {
		collectionCodes,
		description: 'Explore the Pokémon TCG universe. Discover the latest set, check out the prices of the rarest cards, and manage your collection.',
		image: ogImage({ kind: 'page', name: 'home' }, 'PokéCards-Collector, a Pokémon TCG catalogue and collection tracker: its card count in English, Japanese and French, and three of the most valuable cards'),
		profile: locals.profile,
		/** SEO defaults. `page.data` merges layout and page data, so a page only returns the fields it changes and the rest fall back to these. */
		title: 'PokéCards-Collector',
		user: locals.user,
		/** The viewer's card codes, one entry per copy in the collection: the stores and the binder need nothing else of a row. */
		wishlistCodes,
	};
};
