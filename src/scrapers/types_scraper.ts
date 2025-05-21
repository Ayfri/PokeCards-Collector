import * as fs from 'node:fs/promises';
import type {Card} from '../types.js';
import {CARDS, TYPES} from './files.js';


export async function fetchPokemonTypes() {
	const cardsTypes = new Set<string>();

	const cards = JSON.parse(await fs.readFile(CARDS, 'utf-8')).flat() as Card[];

	cards.flat().forEach(group => {
		const cardTypes = group.types.includes(',') ? group.types.split(', ') : [group.types];

		cardTypes.forEach(type => {
			if (!cardsTypes.has(type)) {
				cardsTypes.add(type);
				console.log(`Added ${type} to types`);
			}
		});
	});

	console.log(cards.length); // Total number of cards
	console.log(cardsTypes.size); // Total number of unique types

	try {
		await fs.writeFile(TYPES, JSON.stringify([...cardsTypes]));
	} catch (error) {
		console.error('Failed to write types to file:', error);
	}
}
