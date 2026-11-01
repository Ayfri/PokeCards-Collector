import { shiftDay } from '#helpers/card-dle.ts';
import { PRICE_TIERS, scoreRound, type RoundScore } from '#helpers/price-game.ts';
import type { CardDleGuess } from '#lib/types.js';
import { persistedRecord } from '#stores/persisted.svelte.ts';

export interface PriceGameStats {
	bestRound: number;
	bestStreak: number;
	/** Rounds per tier, indexed like PRICE_TIERS (exact first). */
	distribution: number[];
	/** Tier index of the last 10 rounds, oldest first. */
	history: number[];
	/** Sum of each round's % off, capped at 100 so one wild guess on a 3 € card cannot own the average. */
	offSum: number;
	streak: number;
	totalScore: number;
}

/** A factory, so the live record never shares an array with the defaults. */
function emptyPriceStats(): PriceGameStats {
	return { bestRound: 0, bestStreak: 0, distribution: PRICE_TIERS.map(() => 0), history: [], offSum: 0, streak: 0, totalScore: 0 };
}

/**
 * The record saves only when a top-level property is assigned: `distribution[i]++` or `history.push(x)` redraws but never reaches
 * localStorage. Every update builds fresh values and assigns them at the top level. The record is read from localStorage at
 * module load on the client while the server renders the defaults, so a page draws these values only after mount.
 */
class PriceGame {
	#stats = persistedRecord<PriceGameStats>('price-game-stats', emptyPriceStats());

	get stats(): Readonly<PriceGameStats> {
		return this.#stats;
	}

	get rounds(): number {
		return this.#stats.distribution.reduce((sum, count) => sum + count, 0);
	}

	get hits(): number {
		return PRICE_TIERS.reduce((sum, tier, index) => sum + (tier.hit ? (this.#stats.distribution[index] ?? 0) : 0), 0);
	}

	get exact(): number {
		return this.#stats.distribution[0] ?? 0;
	}

	get averageOff(): number | null {
		return this.rounds > 0 ? this.#stats.offSum / this.rounds : null;
	}

	record(tier: number, off: number): RoundScore {
		const stats = this.#stats;
		const score = scoreRound(tier, off, stats.streak);

		Object.assign(stats, {
			bestRound: Math.max(stats.bestRound, score.points),
			bestStreak: Math.max(stats.bestStreak, score.streak),
			distribution: PRICE_TIERS.map((_, index) => (stats.distribution[index] ?? 0) + (index === tier ? 1 : 0)),
			history: [...stats.history, tier].slice(-10),
			offSum: stats.offSum + Math.min(off, 100),
			streak: score.streak,
			totalScore: stats.totalScore + score.points
		} satisfies PriceGameStats);

		return score;
	}

	reset(): void {
		Object.assign(this.#stats, emptyPriceStats());
	}
}

export const priceGame = new PriceGame();

interface CardDleProgress {
	bestStreak: number;
	/** UTC day the guesses belong to, named by the server; '' before the first visit. */
	date: string;
	/** The picker narrows its list by what the guesses proved. A device setting, it survives the daily rollover. */
	easy: boolean;
	/** A guess of the day's board was made with an easy filter active: the shared text says so. */
	easyUsed: boolean;
	/** Oldest first. */
	guesses: CardDleGuess[];
	/** UTC day of the last win, '' before the first. */
	lastWin: string;
	streak: number;
}

function emptyCardDle(): CardDleProgress {
	return { bestStreak: 0, date: '', easy: false, easyUsed: false, guesses: [], lastWin: '', streak: 0 };
}

/**
 * The same write trap as the price game: `guesses.push(x)` redraws but never saves, so every update assigns a top-level property.
 * The board keys on the UTC day the server named, never on the client clock: the page load gives `today` and the guess response gives
 * the day its card was picked for. `rollOver` and `add` start a fresh board when that day differs from the stored one, so a skewed
 * phone clock or a guess answered after midnight lands on the right board. A streak lasts until the end of the day after the last
 * win: it is live while `lastWin` is the board's day or the day before, so a lapsed streak reads 0 without any write.
 */
class CardDleStore {
	#data = persistedRecord<CardDleProgress>('card-dle', emptyCardDle());

	get guesses(): CardDleGuess[] {
		return this.#data.guesses;
	}

	/** UTC day of the stored board. */
	get date(): string {
		return this.#data.date;
	}

	get easy(): boolean {
		return this.#data.easy;
	}

	set easy(value: boolean) {
		this.#data.easy = value;
	}

	get won(): boolean {
		return this.#data.guesses.some(guess => guess.isCorrect);
	}

	get easyUsed(): boolean {
		return this.#data.easyUsed;
	}

	get streak(): number {
		const { date, lastWin, streak } = this.#data;
		return lastWin !== '' && (lastWin === date || lastWin === shiftDay(date, -1)) ? streak : 0;
	}

	get bestStreak(): number {
		return this.#data.bestStreak;
	}

	/** Drops a board from another UTC day. */
	rollOver(today: string): void {
		if (this.#data.date === today) return;

		Object.assign(this.#data, { date: today, easyUsed: false, guesses: [] });
	}

	/** `date` is the day the server judged the guess for, `easyUsed` whether an easy filter narrowed the list the guess was picked from. */
	add(guess: CardDleGuess, date: string, easyUsed: boolean): void {
		this.rollOver(date);
		this.#data.guesses = [...this.#data.guesses, guess];
		if (easyUsed) this.#data.easyUsed = true;

		if (!guess.isCorrect || this.#data.lastWin === date) return;

		const streak = this.#data.lastWin === shiftDay(date, -1) ? this.#data.streak + 1 : 1;
		Object.assign(this.#data, { bestStreak: Math.max(this.#data.bestStreak, streak), lastWin: date, streak });
	}
}

export const cardDle = new CardDleStore();
