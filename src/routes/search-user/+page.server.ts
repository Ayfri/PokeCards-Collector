import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('query') || '';
	return {
		title: query
			? `Search: ${query}`
			: 'User Search',
		description: 'Search for other users and view their profiles.'
	};
};
