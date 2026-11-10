import { loadUserCardsPage } from '#helpers/user-cards-page.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, parent }) => loadUserCardsPage({
	client: locals.supabase,
	kind: 'wishlist',
	parent,
	requestedUsername: params.user,
});
