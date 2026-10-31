import { getUserWishlist } from '#lib/services/wishlists.ts';
import { loadUserCardsPage } from '#helpers/user-cards-page.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, parent }) => loadUserCardsPage({
	client: locals.supabase,
	fetchItems: getUserWishlist,
	kind: 'wishlist',
	parent,
	requestedUsername: params.user,
});
