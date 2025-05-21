// URLs format:
// card image example: https://images.pokemontcg.io/sm9/1_hires.png
// get foil : https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sm9/sm9_en_001_std.foil.png
// get etch : https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sm9/sm9_en_001_std.etch.png

import * as fs from 'node:fs/promises';
import type {Card} from '../types.js';
import {HOLO_CARDS} from './files.js';

export async function getCardMasks() {
	const holoCards = JSON.parse(await fs.readFile(HOLO_CARDS, 'utf-8')).flat() as Card[];

	for (const card of holoCards) {
		const urlSegments = card.image.split('/');
		if (urlSegments.length < 5) {
			console.error(`Invalid card image URL: ${card.image}`);
			continue;
		}

		const setId = urlSegments[3];
		const cardId = urlSegments[4].split('_')[0].padStart(3, '0');

		console.log(`URL: ${card.image} / Set ID: ${setId} / Card ID: ${cardId}`);

		const foilUrl = `https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/${setId}/${setId}_en_${cardId}_std.foil.png`;
		console.log(`>>>> Foil URL: ${foilUrl}`);

		const etchUrl = `https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/${setId}/${setId}_en_${cardId}_std.etch.png`;
		console.log(`>>>> Etch URL: ${etchUrl}`);
	}
}
