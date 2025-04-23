import type { Set } from "$lib/types";
import { parseCardCode } from "./card-utils";

export function getSetCodeFromImage(imageUrl: string): string | undefined {
	const parts = imageUrl.split('/');
	return parts.at(-2);
}

export function findSetByCardCode(cardCode: string, sets: Set[]): Set | undefined {
    const { setCode } = parseCardCode(cardCode);
    return sets.find(set => {
        const setCodeFromImage = getSetCodeFromImage(set.logo);
        return setCodeFromImage === setCode;
    });
}

