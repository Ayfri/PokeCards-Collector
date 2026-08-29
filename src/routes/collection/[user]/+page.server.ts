import { getUserCollection } from '$lib/services/collections';
import { loadUserCardsPage } from '$helpers/user-cards-page';
import type { PageServerLoad } from './$types';

/**
 * `?set=` is deliberately not read here: reading it makes SvelteKit rerun the load - and restream the collection -
 * every time the grid changes its set filter. `CardGrid` seeds the same filter from the URL on the client instead.
 */
export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { profile: loggedInUserProfile, collectionItems } = await parent();

	return loadUserCardsPage({
		client: locals.supabase,
		fetchItems: getUserCollection,
		kind: 'collection',
		loggedInUsername: loggedInUserProfile?.username ?? null,
		ownItems: collectionItems,
		requestedUsername: params.user,
	});
};
