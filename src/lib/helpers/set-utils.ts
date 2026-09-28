import type { Set } from "$lib/types";
import setAliases from '$lib/data/set-aliases.json' with { type: 'json' };
import { parseCardCode } from "./card-utils";

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * The set code baked into a `card_code` is the legacy pokemontcg.io / tcgcollector code, which does not
 * always match the TCGdex `set_id` a set now carries (`sv3` against `sv03`). `set-aliases.json`, generated
 * by the scraper audit, bridges the two, so a code stays resolvable whatever generation it was minted in.
 * The same legacy code means a different set per language (`sv3` is `sv03` in English, `SV3` in Japanese),
 * so an alias only counts when its target is in the set list being searched.
 */
const aliasEntries = Object.values(setAliases).flatMap(langAliases => Object.entries(langAliases).map(([legacy, setId]) => [normalize(legacy), normalize(setId)] as const));

/**
 * How many cards a set holds. `printedTotal` is the numbering denominator TCGdex leaves at 0 on the promo sets,
 * which is why they used to be listed as holding no card at all while their page showed dozens.
 */
export const setCardCount = (set: Pick<Set, 'printedTotal' | 'totalCards'>) => set.totalCards || set.printedTotal;

/** Maps every normalized set id, and every legacy code aliased to one of these sets, to its set. */
export function buildSetLookupMap(sets: ReadonlyArray<Set>): Map<string, Set> {
	const lookupMap = new Map<string, Set>();
	if (!sets) return lookupMap;

	for (const set of sets) {
		if (!set?.setId) continue;
		const key = normalize(set.setId);
		if (!lookupMap.has(key)) lookupMap.set(key, set);
	}
	for (const [legacy, setId] of aliasEntries) {
		const set = lookupMap.get(setId);
		if (set && legacy !== setId) lookupMap.set(legacy, set);
	}
	return lookupMap;
}

/** Resolves a `card_code` against a map built by `buildSetLookupMap`, which is what any per-card loop should use. */
export function findSetInLookup(cardCode: string, lookupMap: Map<string, Set>): Set | undefined {
	const setCode = parseCardCode(cardCode).setCode;
	return setCode ? lookupMap.get(normalize(setCode)) : undefined;
}

export function findSetByCardCode(cardCode: string, sets: Set[]): Set | undefined {
	if (!cardCode || !Array.isArray(sets) || sets.length === 0) return undefined;
	return findSetInLookup(cardCode, buildSetLookupMap(sets));
}
