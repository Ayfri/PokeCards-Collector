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

/**
 * The elapsed time in its largest whole unit, floored so it never overstates.
 * @example timeAgo('2024-03-01') // "2 years ago" on 2026-09-28
 */
export function timeAgo(date: string | Date): string {
	const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
	const [unit, length] = UNITS.find(([, length]) => seconds >= length) ?? UNITS.at(-1)!;
	return relativeTimeFormatter.format(-Math.floor(seconds / length), unit);
}
