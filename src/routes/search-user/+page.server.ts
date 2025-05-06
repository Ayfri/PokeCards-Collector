import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q') || '';
	
	return {
		title: query ? `Search Results for "${query}" - PokéStore` : 'Users - PokéStore',
		description: 'Search for Pokémon TCG collectors by username and view their profiles and collections.',
	};
}; 