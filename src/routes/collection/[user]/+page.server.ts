import { loadUserCardsPage } from '#helpers/user-cards-page.ts';
import type { PageServerLoad } from './$types';

/**
 * `?set=` is deliberately not read here: reading it makes SvelteKit rerun the load and stream the collection again
 * every time the set filter changes. `CardGrid` seeds the same filter from the URL on the client instead.
 */
export const load: PageServerLoad = ({ locals, params, parent }) => loadUserCardsPage({
	client: locals.supabase,
	kind: 'collection',
	parent,
	requestedUsername: params.user,
});
