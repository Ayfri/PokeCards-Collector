import { cardPrice, memoizedOn } from '#helpers/card-utils.ts';
import type { CardDleGuess, CardDleSuggestion, FullCard, PriceData } from '#lib/types.js';

/** Cards priced below this are bulk nobody recognises, so they are never guessable and never the card of the day. */
export const CARD_DLE_MIN_PRICE = 3;

/** UTC `YYYY-MM-DD`, `offsetDays` from today: the card of the day, the stored board and the streak all key on it. */
export function utcDay(offsetDays = 0): string {
	return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** The UTC day `offsetDays` from a `YYYY-MM-DD`, for days the server named: the client clock never decides which board a guess belongs to. */
export function shiftDay(date: string, offsetDays: number): string {
	return new Date(Date.parse(`${date}T00:00:00Z`) + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** `priceComparison` describes the guess, the board points toward the mystery card. */
export const PRICE_HINTS = {
	correct: { emoji: '🟩', hint: 'Same price as the mystery card' },
	higher: { emoji: '⬇️', hint: 'The mystery card costs less' },
	lower: { emoji: '⬆️', hint: 'The mystery card costs more' }
} as const;

const tile = (correct: boolean) => (correct ? '🟩' : '🟥');

/** What the board has proven about the mystery card; a `null` is not pinned yet. Price bounds are exclusive. */
export interface EasyFilters {
	artist: string | null;
	name: string | null;
	price: number | null;
	priceAbove: number | null;
	priceBelow: number | null;
	rarity: string | null;
	setName: string | null;
	supertype: string | null;
	types: string | null;
}

/**
 * Only the greens and the price direction narrow the pool, a red never excludes its value. The attributes compare like the guess
 * endpoint does (full card name, raw `types` string). `priceComparison` describes the guess: `higher` means the guess costs more, so
 * the mystery card costs less than `priceValue`. A `null` check, not a truthiness one: a Trainer's `types` is the empty string.
 */
export function easyFilters(guesses: CardDleGuess[]): EasyFilters {
	const filters: EasyFilters = { artist: null, name: null, price: null, priceAbove: null, priceBelow: null, rarity: null, setName: null, supertype: null, types: null };

	for (const { feedback } of guesses) {
		if (feedback.pokemonCorrect) filters.name = feedback.pokemonValue;
		if (feedback.artistCorrect) filters.artist = feedback.artistValue;
		if (feedback.setCorrect) filters.setName = feedback.setValue;
		if (feedback.rarityCorrect) filters.rarity = feedback.rarityValue;
		if (feedback.supertypeCorrect) filters.supertype = feedback.supertypeValue;
		if (feedback.typesCorrect) filters.types = feedback.typesValue;

		if (feedback.priceComparison === 'correct') filters.price = feedback.priceValue;
		else if (feedback.priceComparison === 'higher') filters.priceBelow = Math.min(filters.priceBelow ?? Infinity, feedback.priceValue);
		else filters.priceAbove = Math.max(filters.priceAbove ?? -Infinity, feedback.priceValue);
	}

	return filters;
}

export function hasEasyFilters(filters: EasyFilters): boolean {
	return Object.values(filters).some(value => value !== null);
}

/**
 * The candidate prices come from the session-cached suggestions while the bounds come from live guesses, so a price that moved can
 * leave no card inside them. The picker retries with this variant instead of hiding the answer.
 */
export function withoutPrice(filters: EasyFilters): EasyFilters {
	return { ...filters, price: null, priceAbove: null, priceBelow: null };
}

export function matchesEasyFilters(card: CardDleSuggestion, filters: EasyFilters): boolean {
	return (
		(filters.name === null || card.name === filters.name) &&
		(filters.artist === null || card.artist === filters.artist) &&
		(filters.setName === null || card.setName === filters.setName) &&
		(filters.rarity === null || card.rarity === filters.rarity) &&
		(filters.supertype === null || card.supertype === filters.supertype) &&
		(filters.types === null || card.types === filters.types) &&
		(filters.price === null || card.price === filters.price) &&
		(filters.priceBelow === null || card.price < filters.priceBelow) &&
		(filters.priceAbove === null || card.price > filters.priceAbove)
	);
}

/** The spoiler-free grid players paste: one line per guess, oldest first, in the order the board draws its tiles. */
export function shareText(date: string, guesses: CardDleGuess[], url: string, easyUsed: boolean): string {
	const rows = guesses.map(({ feedback }) =>
		[
			feedback.supertypeValue === 'Pokémon' ? tile(feedback.pokemonCorrect) : '⬛',
			tile(feedback.artistCorrect),
			tile(feedback.setCorrect),
			tile(feedback.rarityCorrect),
			tile(feedback.supertypeCorrect),
			tile(feedback.typesCorrect),
			PRICE_HINTS[feedback.priceComparison].emoji
		].join('')
	);

	return [`Card.dle ${date} - ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}${easyUsed ? ' (easy mode)' : ''}`, ...rows, url].join('\n');
}

interface CardOfTheDay extends FullCard {
	price: number;
}

/** FNV-1a, 32 bits. */
function hash(text: string): number {
	let value = 0x811c9dc5;
	for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
	return value >>> 0;
}

/** Every guess and every page load asks for the same pick, so the 21k-card scan runs once per day and memoized tables, keyed on their identity (the card list and the price table). */
const pickMemo = new WeakMap<object, unknown>();

/**
 * Rendezvous hashing: the eligible card with the lowest hash of `date:cardCode` wins. A card's score depends only on
 * the date and its own code, so when the daily scrape adds or removes a card, the pick changes only if that card is
 * the winner. Two days never pick neighbouring codes. `date` is a UTC `YYYY-MM-DD`.
 */
export function pickCardOfTheDay(date: string, cards: FullCard[], prices: Record<string, PriceData>): CardOfTheDay | null {
	const days = memoizedOn(pickMemo, [cards, prices], () => new Map<string, CardOfTheDay | null>());
	const known = days.get(date);
	if (known !== undefined) return known;

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

	days.set(date, winner);
	return winner;
}
