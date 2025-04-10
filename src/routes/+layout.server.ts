import { getCards } from '$helpers/data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ route }) => {
	console.log(`[${new Date().toISOString()}] FETCHING CARDS ${route.id}`);

	// Charger seulement les données essentielles pour la page d'accueil
	// Optimisation: Ajouter un flag pour éviter les opérations lourdes sur les pages qui n'en ont pas besoin
	const isCatalogPage = route.id === '/' || route.id === null;
	let cards = await getCards();

	// N'effectuer ces opérations que sur la page d'accueil
	if (isCatalogPage) {
		// unique by image
		console.log("BEFORE FILTER", cards.length);
		const seenImages = new Set();
		cards = cards.filter(card => {
			// On vérifie d'abord que card.setName existe, sinon on rejette immédiatement la carte.
			if (!card.setName) return false;

			// Si l'image a déjà été rencontrée, on la rejette.
			if (seenImages.has(card.image)) return false;

			// Sinon, on ajoute l'image au Set et on garde la carte.
			seenImages.add(card.image);
			return true;
		});
		console.log("AFTER FILTER", cards.length);
		cards = cards.filter((card) => card.setName);
		console.log("AFTER FILTER 2", cards.length);
	}

	console.log(`[${new Date().toISOString()}] CARDS FETCHED ${route.id}`);

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
