import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// Removed card loading from layout
	return {
		title: 'PokéStore',
		description:
			'Browse, search, and filter through a comprehensive list of Pokémon TCG cards. Find cards by set, rarity, type, and more."',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List',
		},
		// Explicitly return an empty array for allCards to satisfy the type, even though it's not used here
		allCards: [],
	};
}
