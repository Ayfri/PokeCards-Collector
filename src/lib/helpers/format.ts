const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' });

/** Largest unit first, with its length in seconds; months and years use their average length. */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31_557_600],
	['month', 2_629_800],
	['week', 604_800],
	['day', 86_400],
	['hour', 3_600],
	['minute', 60],
	['second', 1],
];

export function pascalCase(str: string): string {
	return str.replace(/(\w)(\w*)/g, (_, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}

/**
 * The elapsed time in its largest whole unit, floored so it never overstates.
 * @example timeAgo('2024-03-01') // "2 years ago" on 2026-09-28
 */
export function timeAgo(date: string | Date): string {
	const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
	const [unit, length] = UNITS.find(([, length]) => seconds >= length) ?? UNITS.at(-1)!;
	return relativeTimeFormatter.format(-Math.floor(seconds / length), unit);
}

/**
 * A calendar date, which the database stores at UTC midnight: it prints in UTC so the day is the same west of UTC and in the server-rendered text.
 * Every caller formats a set release date; a timestamp (a join date, "price updated at") must not go through it.
 * @example formatDate('2024-03-01') // "March 1, 2024"
 */
export function formatDate(date: string | Date): string {
	return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** One formatter per precision: `toLocaleString` with options builds a new `Intl.NumberFormat` on every call, and grid tiles format a price each. */
const euroFormatters = new Map<number, Intl.NumberFormat>();

/**
 * A Cardmarket amount, always padded to `fractionDigits` decimals and grouped by thousands.
 * @example formatEuros(1234.5) // "1,234.50 €"
 * @example formatEuros(1234.5, 0) // "1,235 €"
 */
export function formatEuros(value: number, fractionDigits = 2): string {
	let formatter = euroFormatters.get(fractionDigits);
	if (!formatter) euroFormatters.set(fractionDigits, formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }));
	return `${formatter.format(value)} €`;
}
