import type {TcgdexClient} from './client';
import type {Language, MappedCard, MappedSet} from './mappers';
import type {TcgdexCardBrief} from './types';

/** CLI only: the reprint search needs the whole catalogue of a language, which the Worker's batches of 4 sets never hold. */

interface Art {
	/** Like `MappedCard.image`: an extensionless TCGdex image base, or a CardTrader scan URL when the reprint it comes from carries one. */
	image: string;
	/** `lang:<language>`, `reprint:<tcgdex id>` or `energy:<tcgdex id>`. */
	source: string;
}

/**
 * Languages whose scan of the same TCGdex id can stand in, best first. A French card only lacks its English scan when the English card has none
 * either, except the Arceus `pl4-AR*` cards that French files under `pl3`, which the set-based English fallback misses. Japanese ids are their own.
 */
const SCAN_LANGUAGES: Record<Language, readonly string[]> = {
	en: ['fr', 'de', 'es', 'it', 'pt'],
	fr: ['en', 'de', 'es', 'it', 'pt'],
	ja: [],
};

/** Language -> card id -> image base, in the order of preference. The briefs of `/v2/{lang}/cards` already carry the image. */
async function otherLanguageScans(client: TcgdexClient, lang: Language): Promise<Map<string, Map<string, string>>> {
	const lists = await Promise.all(SCAN_LANGUAGES[lang].map(async other => {
		const briefs = await client.json<TcgdexCardBrief[]>(`/v2/${other}/cards`);
		return [other, new Map(briefs?.flatMap(card => card.image ? [[card.id, card.image] as const] : []))] as const;
	}));
	return new Map(lists);
}

/** Lowercase, NFKC, no trailing parenthetical, letters and digits only. Unicode letters stay, or every Japanese name would normalize to nothing. */
const norm = (text: string) => text.toLowerCase().normalize('NFKC').replace(/\s*\([^)]*\)$/, '').replace(/[^\p{L}\p{N}]/gu, '');

const reprintKey = (card: MappedCard) => `${card.supertype}|${norm(card.name)}|${norm(card.artist)}`;
const isBasicEnergy = (card: MappedCard) => card.supertype === 'Energy' && card.subtype === 'Normal' && !!card.types && !card.types.includes(',');

/**
 * Fallback artwork for every card without a scan, from the first source that has one: the scan of the same id in another language, a reprint (a scanned
 * card of the same category with the same name and illustrator, the newest one, ties broken by id), or a scanned basic Energy of the same type.
 * A reprint can itself carry a borrowed scan (the French English fallback, the Japanese twin, a CardTrader scan), which is still a picture of the same art.
 */
function findArt(cards: readonly MappedCard[], sets: readonly MappedSet[], scans: ReadonlyMap<string, ReadonlyMap<string, string>>): Map<string, Art> {
	const released = new Map(sets.map(set => [set.setId, set.releaseDate]));
	const newestLast = cards.filter(card => card.image).sort((a, b) => (released.get(a.setId) ?? '').localeCompare(released.get(b.setId) ?? '') || a.tcgdexId.localeCompare(b.tcgdexId));
	const reprints = new Map<string, MappedCard>();
	const energies = new Map<string, MappedCard>();
	for (const card of newestLast) {
		if (card.artist !== 'Unknown') reprints.set(reprintKey(card), card);
		if (isBasicEnergy(card)) energies.set(card.types, card);
	}

	const found = new Map<string, Art>();
	for (const card of cards) {
		if (card.image) continue;
		const other = [...scans].find(([, byId]) => byId.has(card.tcgdexId));
		const reprint = card.artist === 'Unknown' ? undefined : reprints.get(reprintKey(card));
		const energy = isBasicEnergy(card) ? energies.get(card.types) : undefined;
		if (other) found.set(card.tcgdexId, {image: other[1].get(card.tcgdexId)!, source: `lang:${other[0]}`});
		else if (reprint) found.set(card.tcgdexId, {image: reprint.image, source: `reprint:${reprint.tcgdexId}`});
		else if (energy) found.set(card.tcgdexId, {image: energy.image, source: `energy:${energy.tcgdexId}`});
	}
	return found;
}

/** Sets `artImage` and `artSource` on the cards without a scan that a source covers, and leaves every other card without the keys. */
export async function addFallbackArt(client: TcgdexClient, lang: Language, cards: MappedCard[], sets: readonly MappedSet[]): Promise<void> {
	const found = findArt(cards, sets, await otherLanguageScans(client, lang));
	for (const card of cards) {
		const art = found.get(card.tcgdexId);
		if (!art) continue;
		card.artImage = art.image;
		card.artSource = art.source;
	}
}
