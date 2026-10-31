import type {TcgdexClient} from './client';
import type {TcgdexSetBrief} from './types';

/**
 * Series the catalogue does not carry. `tcgp` is Pokémon TCG Pocket, the mobile game: its cards are virtual, never
 * printed and never sold, so TCGdex has no price for any of them and they would sit in the grid as 2480 permanently
 * priceless entries.
 */
export const EXCLUDED_SERIES = ['tcgp'] as const;

interface TcgdexSerie {
	id: string;
	name: string;
	sets?: TcgdexSetBrief[];
}

/** Set ids of the excluded series, one request per serie. A serie missing in a language answers 404 and adds nothing. */
export async function excludedSetIds(client: TcgdexClient, lang: string): Promise<Set<string>> {
	const series = await Promise.all(EXCLUDED_SERIES.map(id => client.json<TcgdexSerie>(`/v2/${lang}/series/${encodeURIComponent(id)}`)));
	return new Set(series.flatMap(serie => serie?.sets?.map(set => set.id) ?? []));
}

/**
 * The listed sets the catalogue carries, each id once. TCGdex lists ja `BW8a` twice (Raiden Knuckle and Spiral Force) while
 * `/sets/BW8a` only ever answers Raiden Knuckle, and a repeated id makes the whole `jp_sets` upsert fail on its `set_id` conflict.
 */
export function catalogueSets<T extends {id: string}>(sets: readonly T[], excluded: ReadonlySet<string>): T[] {
	const seen = new Set(excluded);
	return sets.filter(set => !seen.has(set.id) && !!seen.add(set.id));
}
