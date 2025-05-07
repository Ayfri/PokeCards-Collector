import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('query') || '';
	return {
		meta: {
			title: query
				? `Search Results for "${query}" - PokéCards-Collector`
				: 'Users - PokéCards-Collector',
			description: 'Search for other users and view their profiles.'
		}
	};
};
