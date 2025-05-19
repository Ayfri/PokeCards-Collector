import type { Set } from "$lib/types";
import { parseCardCode } from "./card-utils";

export function getSetCodeFromImage(imageUrl: string | undefined | null): string | undefined {
	if (!imageUrl) { // Handles null, undefined, empty string
		return undefined;
	}
	const parts = imageUrl.split('/');
	return parts.at(-2);
}

export function findSetByCardCode(cardCode: string, sets: Set[]): Set | undefined {
    try {
        if (!cardCode || !sets || !Array.isArray(sets) || sets.length === 0) {
            return undefined;
        }

        const parsed = parseCardCode(cardCode);
        // Ensure parsed result and setCode are valid strings
        if (!parsed || typeof parsed.setCode !== 'string' || !parsed.setCode) {
            return undefined;
        }

        const lowerTargetSetCode = parsed.setCode.toLowerCase(); // Calculate target lowercase once

        return sets.find(set => {
            if (!set) { // Skip invalid set entries
                return false;
            }

            // Check aliases: ensure alias exists and then compare
            if (set.aliases?.some(alias => alias && alias.toLowerCase() === lowerTargetSetCode)) {
                return true;
            }

            // Check logo-derived set code (getSetCodeFromImage is now robust)
            const logoSetCode = getSetCodeFromImage(set.logo);
            if (logoSetCode && logoSetCode.toLowerCase() === lowerTargetSetCode) {
                return true;
            }

            return false; // No match for this set
        });
    } catch (error) {
        // This catch block is for errors in parseCardCode or unexpected issues.
        console.error(`Error in findSetByCardCode processing "${cardCode}":`, error);
        return undefined;
    }
}

export function buildSetLookupMap(sets: ReadonlyArray<Set>): Map<string, Set> {
    const lookupMap = new Map<string, Set>();
    if (!sets) return lookupMap;

    for (const set of sets) { // Iterate in the same order as .find() would
        if (!set) continue;

        // Check aliases
        if (set.aliases) {
            for (const alias of set.aliases) {
                if (alias) { // Ensure alias is not null/undefined
                    const lowerAlias = alias.toLowerCase();
                    if (!lookupMap.has(lowerAlias)) { // Add if not already mapped by an earlier set
                        lookupMap.set(lowerAlias, set);
                    }
                }
            }
        }

        // Check logo-derived set code
        const logoSetCode = getSetCodeFromImage(set.logo);
        if (logoSetCode) {
            const lowerLogoSetCode = logoSetCode.toLowerCase();
            if (!lookupMap.has(lowerLogoSetCode)) { // Add if not already mapped by an earlier set
                lookupMap.set(lowerLogoSetCode, set);
            }
        }
    }
    return lookupMap;
}
