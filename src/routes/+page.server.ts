import { getRarities, getSets, getTypes, getArtists, getPokemons } from '$helpers/data';
export async function load({ parent }) {
	const { allCards } = await parent();

	// Count different card types
	const pokemonCards = allCards.filter(card => card.supertype === 'Pokémon');
	const trainerCards = allCards.filter(card => card.supertype === 'Trainer');
	const energyCards = allCards.filter(card => card.supertype === 'Energy');

	// Count unique Pokemon
	const uniquePokemon = new Set(pokemonCards.map(card => card.pokemonNumber).filter(Boolean)).size;

	const pokemons = await getPokemons();
	const sets = await getSets();
	const rarities = await getRarities();
	const types = await getTypes();
	const artists = await getArtists();

	// Trier les sets par ordre alphabétique
	sets.sort((a, b) => a.name.localeCompare(b.name));

	return {
		sets,
		rarities,
		types,
		artists,
		pokemons,
		title: 'PokéStore',
		description:
			'Browse, search, and filter through a comprehensive list of Pokémon TCG cards. Find cards by set, rarity, type, and more."',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List',
		},
		stats: {
			totalCards: allCards.length,
			uniquePokemon,
			pokemonCards: pokemonCards.length,
			trainerCards: trainerCards.length,
			energyCards: energyCards.length,
		}
	};
}
