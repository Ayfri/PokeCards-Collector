import { getUserWishlist } from '$lib/services/wishlists';
import { loadUserCardsPage } from '$helpers/user-cards-page';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { profile: loggedInUserProfile, wishlistItems } = await parent();

	return loadUserCardsPage({
		client: locals.supabase,
		fetchItems: getUserWishlist,
		kind: 'wishlist',
		loggedInUsername: loggedInUserProfile?.username ?? null,
		ownItems: wishlistItems,
		requestedUsername: params.user,
	});
};
