/**
 * TCGdex rarities from most common to rarest, names sharing a tier rank the same.
 * The modern tiers follow the official Japanese scale Scarlet & Violet adopted (C < U < R < RR < ACE < AR < S < SR < SSR < SAR < UR < BWR < MUR),
 * which is also the order English sets number their secret cards in. Older tiers sit next to their Japanese equivalent (V = RR, VMAX/VSTAR = RRR).
 * The Pocket tiers (diamonds, stars, shiny, crown) only keep `bun run scrapers audit` quiet, since the catalogue excludes that serie.
 */
const RARITY_TIERS: string[][] = [
	['none'],
	['common', 'one diamond'],
	['uncommon', 'two diamond'],
	['promo'],
	['rare', 'three diamond'],
	['pikachu rare'],
	['rare holo', 'holo rare', 'four diamond'],
	['classic collection'],
	['rare holo lv.x'],
	['rare prime'],
	['legend'],
	['holo rare v', 'double rare'],
	['radiant rare'],
	['amazing rare'],
	['holo rare vmax', 'holo rare vstar', 'triple rare'],
	['ace spec rare'],
	['character rare'],
	['illustration rare', 'one star'],
	['shiny rare', 'one shiny'],
	['shiny rare v', 'shiny rare vmax'],
	['full art trainer'],
	['ultra rare'],
	['character super rare'],
	['shiny ultra rare', 'two shiny'],
	['secret rare'],
	['special illustration rare', 'two star'],
	['futuristic rare'],
	['hyper rare', 'three star'],
	['black white rare'],
	['mega hyper rare'],
	['crown'],
];

/** Lowercased rarity name to its tier index. */
export const RARITY_MAPPING: Record<string, number> = Object.fromEntries(RARITY_TIERS.flatMap((names, level) => names.map(name => [name, level])));

export function getRarityLevel(rarity: string): number {
	return RARITY_MAPPING[rarity?.toLowerCase()] ?? 0;
}

/** Sorts rarity names from most common to rarest, alphabetically within a tier. */
export function compareRarities(a: string, b: string): number {
	return getRarityLevel(a) - getRarityLevel(b) || a.localeCompare(b);
}
