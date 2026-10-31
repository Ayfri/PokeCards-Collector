import type { PageServerLoad } from './$types';
import { breadcrumbs } from '$helpers/seo';
import { searchUsers } from '$lib/services/profiles';

/** How many collectors the page features. They are ranked in SQL: an empty query makes the RPC list every public profile by unique cards. */
const FEATURED_COUNT = 5;

export const load: PageServerLoad = async () => {
	const { data, error } = await searchUsers('', FEATURED_COUNT);
	const featuredUsers = data ?? [];
	const featuredUsersError = error ? 'Could not fetch the featured collectors.' : null;
	if (error) console.error('Error preparing featured users:', error);

	return {
		featuredUsers,
		featuredUsersError,
		breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }),
		description: 'Browse the public Pokémon TCG collections on PokéCards-Collector. See the collectors holding the most unique cards, and search for a collector by name.',
		keywords: ['Pokémon TCG collectors', 'public Pokémon collections', 'Pokémon card collection ranking'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: featuredUsers.map((user, index) => ({
				'@type': 'ListItem',
				name: user.username,
				position: index + 1,
				url: `/profile/${user.username}`,
			})),
			name: 'Featured Pokémon TCG collectors',
			numberOfItems: featuredUsers.length,
		}],
		title: 'Pokémon TCG Collectors',
		type: 'CollectionPage' as const,
	};
};
