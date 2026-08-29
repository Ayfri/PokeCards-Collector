import type {TcgdexClient} from './client';
import type {TcgdexSetBrief} from './types';

/**
 * Series the catalogue does not carry. `tcgp` is Pokémon TCG Pocket, the mobile game: its cards are
 * virtual, never printed and never sold, so TCGdex has no pricing for a single one of them and they
 * would sit in the grid as 2480 permanently priceless entries.
 */
export const EXCLUDED_SERIES = ['tcgp'] as const;

interface TcgdexSerie {
	id: string;
	name: string;
	sets?: TcgdexSetBrief[];
}

/** Set ids belonging to an excluded serie, one request per serie. A serie a language does not have answers 404 and contributes nothing. */
export async function excludedSetIds(client: TcgdexClient, lang: string): Promise<Set<string>> {
	const series = await Promise.all(EXCLUDED_SERIES.map(id => client.json<TcgdexSerie>(`/v2/${lang}/series/${encodeURIComponent(id)}`)));
	return new Set(series.flatMap(serie => serie?.sets?.map(set => set.id) ?? []));
}

/** Convenience for a caller that already holds the set list. */
export const withoutExcluded = <T extends {id: string}>(sets: readonly T[], excluded: ReadonlySet<string>): T[] => sets.filter(set => !excluded.has(set.id));
