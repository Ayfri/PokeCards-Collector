import { getCards } from '$helpers/data';
import type { FullCard } from '$lib/types';

export async function load() {
	let cards: FullCard[] = await getCards();

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

	return {
		allCards: cards
	};
}
