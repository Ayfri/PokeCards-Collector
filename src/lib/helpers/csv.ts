/** Delimiters a collection export can use, most distinctive first: a French CSV separates on `;`, a clipboard dump on tabs. */
const DELIMITERS = ['\t', ';', ',', '|'] as const;

/** The delimiter that cuts the first non-empty line into the most fields is the one the file is written with. */
function sniffDelimiter(text: string): string {
	const header = text.split(/\r?\n/).find(line => line.trim().length > 0) ?? '';
	let best: string = DELIMITERS[0];
	let bestCount = 0;

	for (const delimiter of DELIMITERS) {
		// Counted outside quoted runs, so a `Charizard, Base Set` cell does not make `,` look like the separator.
		let count = 0;
		let quoted = false;
		for (let index = 0; index < header.length; index++) {
			const char = header[index];
			if (char === '"') quoted = !quoted;
			else if (!quoted && char === delimiter) count++;
		}
		if (count > bestCount) {
			best = delimiter;
			bestCount = count;
		}
	}

	return best;
}

/**
 * RFC 4180 parse with the delimiter sniffed rather than assumed. Handles `""` escapes, quoted newlines, CRLF and a
 * leading BOM, and drops the trailing empty line every exporter leaves behind.
 */
export function parseDelimited(input: string): string[][] {
	const text = input.replace(/^﻿/, '');
	const delimiter = sniffDelimiter(text);
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;

	for (let index = 0; index < text.length; index++) {
		const char = text[index];

		if (quoted) {
			if (char !== '"') field += char;
			else if (text[index + 1] === '"') { field += '"'; index++; }
			else quoted = false;
			continue;
		}

		if (char === '"') quoted = true;
		else if (char === delimiter) { row.push(field); field = ''; }
		else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[index + 1] === '\n') index++;
			row.push(field);
			field = '';
			if (row.some(cell => cell.trim().length > 0)) rows.push(row);
			row = [];
		} else field += char;
	}

	row.push(field);
	if (row.some(cell => cell.trim().length > 0)) rows.push(row);

	return rows.map(cells => cells.map(cell => cell.trim()));
}
