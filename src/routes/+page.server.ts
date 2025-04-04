import { getCards, getRarities, getSets, getTypes, getArtists } from '$helpers/data';

export async function load() {
	let cards = await getCards();

	// unique by image
	cards = cards.filter((card, index, self) => self.findIndex(c => c.image === card.image) === index);
	cards = cards.filter((card) => card.set);
	
	// Ensure all cards have a supertype
	cards.forEach(card => {
		// Si pas de supertype, essaie de le deviner
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

	// Count different card types
	const pokemonCards = cards.filter(card => card.supertype === 'Pokémon');
	const trainerCards = cards.filter(card => card.supertype === 'Trainer');
	const energyCards = cards.filter(card => card.supertype === 'Energy');
	
	// Count unique Pokemon
	const uniquePokemon = new Set(pokemonCards.map(card => card.pokemon?.id).filter(Boolean)).size;

	const sets = await getSets();
	const rarities = await getRarities();
	const types = await getTypes();
	const artists = await getArtists();

	return {
		cards,
		sets,
		rarities,
		types,
		artists,
		title: 'PokéStore',
		description:
			'Browse, search, and filter through a comprehensive list of Pokémon TCG cards. Find cards by set, rarity, type, and more."',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List',
		},
		stats: {
			totalCards: cards.length,
			uniquePokemon,
			pokemonCards: pokemonCards.length,
			trainerCards: trainerCards.length,
			energyCards: energyCards.length,
		}
	};
}
