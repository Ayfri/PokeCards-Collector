import { getCards, getRarities, getSets, getTypes } from '$helpers/data';

export async function load() {
	let cards = await getCards();

	// unique by image
	cards = cards.filter((card, index, self) => self.findIndex(c => c.image === card.image) === index);
	cards = cards.filter((card) => card.set);

	const sets = await getSets();
	const rarities = await getRarities();
	const types = await getTypes();

	return {
		cards,
		sets,
		rarities,
		types,
		title: 'PokéStore',
		description: 'Browse and search through a comprehensive list of Pokémon TCG cards.',
		image: {
			url: 'https://pokestore.ayfri.com/pokestore.png',
			alt: 'PokéStore - Pokémon TCG Card List'
		}
	};
}
