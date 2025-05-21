import * as fs from 'node:fs/promises';
import type {Card} from '../types.js';
import {CARDS, HOLO_CARDS} from './files.js'; // Using fs/promises for async operations


export async function fetchHoloCards() {
	const cards = JSON.parse(await fs.readFile(CARDS, 'utf-8')).flat() as Card[];

	const holoCards = cards.filter(card => {
		console.log(`Pokémon n°${card.numero} / ${card.rarity} / ${card.image} / ${card.set_name} / ${card.price}`);
		return card.rarity && card.rarity.includes('Holo');
	});

	try {
		await fs.writeFile(HOLO_CARDS, JSON.stringify(holoCards));
	} catch (error) {
		console.error('Failed to write holo cards to file:', error);
	}
}
