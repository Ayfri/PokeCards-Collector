import type { Set } from "$lib/types";

/** How many cards a set holds: `printedTotal` is the numbering denominator, which TCGdex leaves at 0 on the promo sets. */
export const setCardCount = (set: Pick<Set, 'printedTotal' | 'totalCards'>) => set.totalCards || set.printedTotal;
