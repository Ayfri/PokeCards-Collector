import type { Set } from "$lib/types";
import setAliases from '$lib/data/set-aliases.json' with { type: 'json' };
import { parseCardCode } from "./card-utils";

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * The set code baked into a `card_code` is the legacy pokemontcg.io / tcgcollector code, which does not
 * always match the TCGdex `set_id` a set now carries (`sv3` against `sv03`). `set-aliases.json`, generated
 * by the scraper audit, bridges the two, so a code stays resolvable whatever generation it was minted in.
 */
const legacyToSetId = new Map<string, string>();
for (const langAliases of Object.values(setAliases)) {
	for (const [legacyCode, setId] of Object.entries(langAliases)) legacyToSetId.set(normalize(legacyCode), normalize(setId));
}

const setKey = (setCode: string) => legacyToSetId.get(setCode) ?? setCode;

export function findSetByCardCode(cardCode: string, sets: Set[]): Set | undefined {
	if (!cardCode || !Array.isArray(sets) || sets.length === 0) return undefined;

	const setCode = parseCardCode(cardCode).setCode;
	if (!setCode) return undefined;

	const key = setKey(normalize(setCode));
	return sets.find(set => set?.setId && normalize(set.setId) === key);
}

export function buildSetLookupMap(sets: ReadonlyArray<Set>): Map<string, Set> {
	const lookupMap = new Map<string, Set>();
	if (!sets) return lookupMap;

	for (const set of sets) {
		if (!set?.setId) continue;
		const key = normalize(set.setId);
		if (!lookupMap.has(key)) lookupMap.set(key, set);
	}
	return lookupMap;
}

/** Resolves a `card_code` against a map built by `buildSetLookupMap`, which is what any per-card loop should use. */
export function findSetInLookup(cardCode: string, lookupMap: Map<string, Set>): Set | undefined {
	const setCode = parseCardCode(cardCode).setCode;
	return setCode ? lookupMap.get(setKey(normalize(setCode))) : undefined;
}
