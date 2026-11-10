interface PriceTier {
	/** Background for history dots and distribution bars, a full literal so Tailwind sees it. */
	bar: string;
	/** Text colour of the headline. */
	color: string;
	high: string[];
	/** Counts as a hit: keeps the streak alive and raises the combo. */
	hit: boolean;
	low: string[];
	maxOff: number;
}

export interface RoundScore {
	lostStreak: number;
	multiplier: number;
	points: number;
	streak: number;
}

const EXACT = ['Spot on!', 'Nailed it!', 'Perfect call!', 'Are you a dealer or what?', 'To the euro. Respect.'];

/**
 * Tiers by percentage off the real price, first match wins, so a 2 EUR miss on a 5 EUR card counts as much as
 * a 40 EUR miss on a 100 EUR one. Too-high and too-low guesses have their own lines so the hint says which way to move.
 * `hit` marks the tiers that keep a streak alive.
 */
export const PRICE_TIERS: PriceTier[] = [
	{ bar: 'bg-green-500', color: 'text-green-400', high: EXACT, hit: true, low: EXACT, maxOff: 0 },
	{
		bar: 'bg-lime-500',
		color: 'text-lime-400',
		high: ['So close, shave a little off.', 'Nearly! Trim it down a touch.', 'Painfully close, aim a bit lower.'],
		hit: true,
		low: ['So close, add a little more.', 'Nearly! Bump it up a touch.', 'Painfully close, aim a bit higher.'],
		maxOff: 10
	},
	{
		bar: 'bg-yellow-500',
		color: 'text-yellow-400',
		high: ['A bit high.', 'Slightly overvalued.', 'It is worth less than you think.'],
		hit: true,
		low: ['A bit low.', 'Slightly undervalued.', 'It is worth more than you think.'],
		maxOff: 30
	},
	{
		bar: 'bg-orange-500',
		color: 'text-orange-400',
		high: ['Too high, this one is cheaper.', 'Easy there, big spender.', 'You just overpaid, badly.'],
		hit: false,
		low: ['Too low, this one is pricier.', 'You are lowballing this card.', 'That offer would get you laughed at.'],
		maxOff: 75
	},
	{
		bar: 'bg-red-500',
		color: 'text-red-400',
		high: ['Way too high! Save your wallet.', 'Not even close, it is no Charizard.', 'That is full collector fever pricing.'],
		hit: false,
		low: ['Way too low! That is bulk bin energy.', 'Not even close, this is no common.', 'Cold. Very, very cold.'],
		maxOff: Infinity
	}
];

/** Past the last finite tier a guess scores nothing, below it the points fall off quadratically. */
const SCORED_MAX_OFF = PRICE_TIERS[PRICE_TIERS.length - 2].maxOff;
const EXACT_POINTS = 100;
const CLOSE_POINTS = 90;
const COMBO_STEP = 0.5;
const COMBO_MAX = 3;

export function tierLabel(index: number): string {
	const { maxOff } = PRICE_TIERS[index];
	if (index === 0) return 'Exact';
	return Number.isFinite(maxOff) ? `Within ${maxOff}%` : `Over ${PRICE_TIERS[index - 1].maxOff}%`;
}

/** `off` is the percentage between the guess and the price, Infinity for any wrong guess on a free card. */
export function judgeGuess(guessed: number, price: number): { off: number; tier: number } {
	const off = guessed === price ? 0 : price > 0 ? (Math.abs(guessed - price) / price) * 100 : Infinity;
	return { off, tier: PRICE_TIERS.findIndex(tier => off <= tier.maxOff) };
}

export function scoreRound(tier: number, off: number, streakBefore: number): RoundScore {
	const base = tier === 0 ? EXACT_POINTS : Math.round(CLOSE_POINTS * (1 - Math.min(off, SCORED_MAX_OFF) / SCORED_MAX_OFF) ** 2);

	if (!PRICE_TIERS[tier].hit) return { lostStreak: streakBefore, multiplier: 1, points: base, streak: 0 };

	const streak = streakBefore + 1;
	const multiplier = Math.min(1 + (streak - 1) * COMBO_STEP, COMBO_MAX);
	return { lostStreak: 0, multiplier, points: Math.round(base * multiplier), streak };
}
