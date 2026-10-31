import { getUserWishlist } from '$lib/services/wishlists';
import { loadUserCardsPage } from '$helpers/user-cards-page';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, parent }) => loadUserCardsPage({
	client: locals.supabase,
	fetchItems: getUserWishlist,
	kind: 'wishlist',
	parent,
	requestedUsername: params.user,
});
