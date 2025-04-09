import { getCards } from '$helpers/data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ route }) => {
	// Charger seulement les données essentielles pour la page d'accueil
	// Optimisation: Ajouter un flag pour éviter les opérations lourdes sur les pages qui n'en ont pas besoin
	const isCatalogPage = route.id === '/' || route.id === null;
	let cards = await getCards(isCatalogPage);

	// N'effectuer ces opérations que sur la page d'accueil
	if (isCatalogPage) {
		// unique by image
		cards = cards.filter((card, index, self) => self.findIndex(c => c.image === card.image) === index);
		cards = cards.filter((card) => card.set);

		// Ensure all cards have a supertype
		cards.forEach(card => {
			// If no supertype, try to guess it
			if (!card.supertype) {
				if (card.types.toLowerCase().includes('energy')) {
					card.supertype = 'Energy';
				} else if (card.pokemon && card.pokemon.id > 0) {
					card.supertype = 'Pokémon';
				} else {
					card.supertype = 'Trainer';
				}
			}
		});
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
