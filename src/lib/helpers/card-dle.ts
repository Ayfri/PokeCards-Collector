import { cardPrice } from '$helpers/card-utils';
import type { FullCard, PriceData } from '$lib/types';

/** Below this a card is bulk nobody recognises, so it is neither guessable nor ever the card of the day. */
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
 * Rendezvous hashing: the eligible card with the lowest hash of `date:cardCode` wins. Each card's score depends on
 * the date and its own code only, so a card entering or leaving the list (the daily scrape) moves the pick only when
 * it is the winner itself, and two days never pick neighbouring codes. `date` is a UTC `YYYY-MM-DD`.
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
