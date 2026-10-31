import type { Language } from '#helpers/catalogues.ts';
import type { FullCard, PriceData, Set } from '#lib/types.js';

/** What one catalogue holds: its card list, its price table and its sets. */
export interface CatalogueData {
	cards: FullCard[];
	prices: Record<string, PriceData>;
	sets: Set[];
}

/** A catalogue that holds at least one of the codes asked for, along with the cards it resolved. */
export interface OwnedCatalogue extends CatalogueData {
	language: Language;
	owned: FullCard[];
}

export type CatalogueReader = (language: Language) => Promise<CatalogueData>;

/** A French code always has a `fr`-prefixed set part (`pokemon_6_frsv03_125`) and no English or Japanese code does, so the code alone says which table holds it. */
export const isFrenchCode = (code: string) => /^[^_]+_\d+_fr/.test(code);

/**
 * Finds which catalogue holds each code, reading only the tables that can: French codes read `fr_*`, the rest read
 * the English and Japanese tables at once. A code held by both resolves to the English card (19 Japanese codes equal an English one).
 * A catalogue that resolves nothing is left out. The result is ordered en, ja, fr.
 */
export async function readOwnedCatalogues(codes: Iterable<string>, read: CatalogueReader): Promise<OwnedCatalogue[]> {
	const wanted = new Set(codes);

	async function resolve(language: Language, candidates: string[]): Promise<OwnedCatalogue | null> {
		if (candidates.length === 0) return null;
		const catalogue = await read(language);
		const candidateSet = new Set(candidates);
		const owned = catalogue.cards.filter(card => candidateSet.has(card.cardCode));
		return owned.length > 0 ? { ...catalogue, language, owned } : null;
	}

	const [french, others] = [[...wanted].filter(isFrenchCode), [...wanted].filter(code => !isFrenchCode(code))];
	const [english, japanese, frenchCatalogue] = await Promise.all([resolve('en', others), resolve('ja', others), resolve('fr', french)]);
	const inEnglish = new Set(english?.owned.map(card => card.cardCode));
	const japaneseOnly = japanese && { ...japanese, owned: japanese.owned.filter(card => !inEnglish.has(card.cardCode)) };

	return [english, japaneseOnly?.owned.length ? japaneseOnly : null, frenchCatalogue].filter(catalogue => catalogue !== null);
}
