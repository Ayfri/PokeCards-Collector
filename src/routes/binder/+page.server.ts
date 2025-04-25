import { getCards, getPrices, getSets } from '$helpers/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Charger les données nécessaires pour la barre de recherche
	const allCards = await getCards();
	const sets = await getSets();
	const prices = await getPrices();

	return {
		title: 'Binder Builder - PokéStore',
		description: 'Create and manage your digital Pokémon card binder. Organize your collection with a customizable grid.',
		image: '/favicon.png',
		allCards,
		sets,
		prices
	};
}; 