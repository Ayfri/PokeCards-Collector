import type { Set } from "$lib/types";
import { parseCardCode } from "./card-utils";

export function getSetCodeFromImage(imageUrl: string): string | undefined {
	const parts = imageUrl.split('/');
	return parts.at(-2);
}

export function findSetByCardCode(cardCode: string, sets: Set[]): Set | undefined {
    try {
        if (!cardCode || !sets || !Array.isArray(sets) || sets.length === 0) {
            return undefined;
        }
        
        const { setCode } = parseCardCode(cardCode);
        if (!setCode) return undefined;
        
        // Search by set code
        return sets.find(set => {
            // First check if the set exists
            if (!set) return false;
            
            // Look for matches in aliases (case insensitive)
            const hasMatchingAlias = set.aliases?.some(alias => 
                alias.toLowerCase() === setCode.toLowerCase()
            );
            
            if (hasMatchingAlias) return true;
            
            // Check if the set logo contains the set code
            try {
                const logoSetCode = getSetCodeFromImage(set.logo);
                return logoSetCode?.toLowerCase() === setCode.toLowerCase();
            } catch (e) {
                console.error('Error getting set code from logo:', e);
                return false;
            }
        });
    } catch (error) {
        console.error('Error finding set by card code:', error);
        return undefined;
    }
}

