import { getCards } from '$helpers/data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ route }) => {
	const isCatalogPage = route.id === '/' || route.id === null;
	let cards = await getCards();

	// Only filter cards on the catalog page
	if (isCatalogPage) {
		// unique by image
		const seenImages = new Set();
		cards = cards.filter(card => {
			// We first check that card.setName exists, otherwise we reject the card immediately.
			if (!card.setName) return false;

			// If the image has already been encountered, we reject it.
			if (seenImages.has(card.image)) return false;

			// Otherwise, we add the image to the Set and keep the card.
			seenImages.add(card.image);
			return true;
		});

		cards = cards.filter((card) => card.setName);
	}

	return {
		title: 'PokéStore',
		description:
			'Browse, search, and filter through a comprehensive list of Pokémon TCG cards. Find cards by set, rarity, type, and more."',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List',
		},
		allCards: cards,
	};
}
