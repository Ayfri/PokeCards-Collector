import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// Removed card loading from layout
	return {
		title: 'PokéStore',
		description:
			'Search, browse, and filter Pokémon TCG cards by set, rarity, type, and more. Connect your account to manage your collection and wishlist easily at Pokestore.',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List',
		},
		// Explicitly return an empty array for allCards to satisfy the type, even though it's not used here
		allCards: [],
	};
}
