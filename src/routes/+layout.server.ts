import { getCards, getSets, getPrices } from '$helpers/data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Fetch global data needed for all pages (cards, sets, prices)
	const [allCards, sets, prices] = await Promise.all([
		getCards(),
		getSets(),
		getPrices(),
	]);

	return {
		allCards,
		sets,
		prices,
		// Pass user and profile from locals (populated by hooks.server.ts)
		user: locals.user, 
		profile: locals.profile,
	};
};
