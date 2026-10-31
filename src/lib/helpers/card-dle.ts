import { cardPrice } from '#helpers/card-utils.ts';
import type { FullCard, PriceData } from '#lib/types.js';

/** Cards priced below this are bulk nobody recognises, so they are never guessable and never the card of the day. */
export const CARD_DLE_MIN_PRICE = 3;

export interface CardOfTheDay extends FullCard {
	price: number;
}

/** FNV-1a, 32 bits. */
function hash(text: string): number {
	let value = 0x811c9dc5;
	for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
	return value >>> 0;
}

/**
 * Rendezvous hashing: the eligible card with the lowest hash of `date:cardCode` wins. A card's score depends only on
 * the date and its own code, so when the daily scrape adds or removes a card, the pick changes only if that card is
 * the winner. Two days never pick neighbouring codes. `date` is a UTC `YYYY-MM-DD`.
 */
export function pickCardOfTheDay(date: string, cards: FullCard[], prices: Record<string, PriceData>): CardOfTheDay | null {
	let winner: CardOfTheDay | null = null;
	let winnerHash = 0;

	for (const card of cards) {
		const price = cardPrice(prices[card.cardCode]);
		if (!price || price < CARD_DLE_MIN_PRICE) continue;

		const score = hash(`${date}:${card.cardCode}`);
		if (!winner || score < winnerHash || (score === winnerHash && card.cardCode < winner.cardCode)) {
			winner = { ...card, price };
			winnerHash = score;
		}
	}

	return winner;
}
