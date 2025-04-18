import { error } from '@sveltejs/kit';
import { getCards, getPokemons, getSets, getRarities, getTypes } from '$helpers/data';
import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	// Removed session/profile check and wishlist fetching

	// Fetch all necessary data globally (not user-specific yet)
	let allCards: FullCard[] = [];
	let pokemons = [];
	let sets = [];
	let rarities = [];
	let types = [];

	try {
		allCards = await getCards();
		pokemons = await getPokemons();
		sets = await getSets();
		rarities = await getRarities();
		types = await getTypes();
	} catch (e) {
		console.error("Error loading global card data:", e);
		throw error(500, 'Failed to load necessary card data');
	}

	// Return all data needed for potential filtering on client
	return {
		allCards,
		pokemons,
		sets,
		rarities,
		types,
		title: 'My Wishlist',
		description: 'Your Pokémon TCG card wishlist.',
	};
}; 