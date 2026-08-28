export const RARITY_LEVELS = {
	UNKNOWN: 0,
	COMMON: 1,
	UNCOMMON: 2,
	CLASSIC_COLLECTION: 3,
	PROMO: 4,
	RARE: 5,
	RARE_HOLO: 6,
	RARE_HOLO_EX: 7,
	RARE_HOLO_GX: 8,
	RARE_HOLO_LVX: 9,
	RARE_HOLO_STAR: 10,
	RARE_HOLO_V: 11,
	RARE_HOLO_VMAX: 12,
	RARE_HOLO_VSTAR: 13,
	RARE_BREAK: 14,
	DOUBLE_RARE: 15,
	TRIPLE_RARE: 16,
	RARE_PRIME: 17,
	RARE_PRISM_STAR: 18,
	ACE_SPEC_RARE: 19,
	RARE_RAINBOW: 20,
	RARE_SHINING: 21,
	RARE_SHINY: 22,
	RARE_SHINY_GX: 23,
	SHINY_RARE: 24,
	CHARACTER_RARE: 25,
	CHARACTER_SUPER_RARE: 26,
	RARE_ULTRA: 27,
	ULTRA_RARE: 28,
	RARE_SECRET: 29,
	SHINY_ULTRA_RARE: 30,
	RADIANT_RARE: 31,
	AMAZING_RARE: 32,
	BLACK_WHITE_RARE: 33,
	HYPER_RARE: 34,
	MEGA_HYPER_RARE: 35,
	TRAINER_GALLERY_RARE_HOLO: 36,
	ILLUSTRATION_RARE: 37,
	SPECIAL_ILLUSTRATION_RARE: 38,
	LEGEND: 39,
	CROWN: 40,
};

/**
 * Rarity string to sort level. Holds both the legacy pokemontcg.io vocabulary (`rare holo ex`, `rare secret`)
 * and the TCGdex one (`Holo Rare`, `Double rare`, `Crown`, the Pocket diamond/star/shiny tiers).
 */
export const RARITY_MAPPING: { [key: string]: number } = {
	// Common
	'common': RARITY_LEVELS.COMMON,
	'none': RARITY_LEVELS.UNKNOWN,
	'one diamond': RARITY_LEVELS.COMMON,

	// Uncommon
	'uncommon': RARITY_LEVELS.UNCOMMON,
	'two diamond': RARITY_LEVELS.UNCOMMON,

	// Classic Collection
	'classic collection': RARITY_LEVELS.CLASSIC_COLLECTION,

	// Promo
	'promo': RARITY_LEVELS.PROMO,

	// Rare
	'rare': RARITY_LEVELS.RARE,
	'three diamond': RARITY_LEVELS.RARE,

	// Rare Holo
	'rare holo': RARITY_LEVELS.RARE_HOLO,
	'holo rare': RARITY_LEVELS.RARE_HOLO,
	'four diamond': RARITY_LEVELS.RARE_HOLO,

	// Rare Holo EX
	'rare holo ex': RARITY_LEVELS.RARE_HOLO_EX,
	'ex': RARITY_LEVELS.RARE_HOLO_EX,

	// Rare Holo GX
	'rare holo gx': RARITY_LEVELS.RARE_HOLO_GX,
	'gx': RARITY_LEVELS.RARE_HOLO_GX,

	// Rare Holo LV.X
	'rare holo lv.x': RARITY_LEVELS.RARE_HOLO_LVX,
	'lv.x': RARITY_LEVELS.RARE_HOLO_LVX,

	// Rare Holo Star
	'rare holo star': RARITY_LEVELS.RARE_HOLO_STAR,
	'star': RARITY_LEVELS.RARE_HOLO_STAR,

	// Rare Holo V
	'rare holo v': RARITY_LEVELS.RARE_HOLO_V,
	'holo rare v': RARITY_LEVELS.RARE_HOLO_V,
	'v': RARITY_LEVELS.RARE_HOLO_V,

	// Rare Holo VMAX
	'rare holo vmax': RARITY_LEVELS.RARE_HOLO_VMAX,
	'holo rare vmax': RARITY_LEVELS.RARE_HOLO_VMAX,
	'vmax': RARITY_LEVELS.RARE_HOLO_VMAX,

	// Rare Holo VSTAR
	'rare holo vstar': RARITY_LEVELS.RARE_HOLO_VSTAR,
	'holo rare vstar': RARITY_LEVELS.RARE_HOLO_VSTAR,
	'vstar': RARITY_LEVELS.RARE_HOLO_VSTAR,

	// Rare BREAK
	'rare break': RARITY_LEVELS.RARE_BREAK,
	'break': RARITY_LEVELS.RARE_BREAK,

	// Double Rare
	'double rare': RARITY_LEVELS.DOUBLE_RARE,

	// Triple Rare
	'triple rare': RARITY_LEVELS.TRIPLE_RARE,

	// Rare Prime
	'rare prime': RARITY_LEVELS.RARE_PRIME,
	'prime': RARITY_LEVELS.RARE_PRIME,

	// Rare Prism Star
	'rare prism star': RARITY_LEVELS.RARE_PRISM_STAR,
	'prism star': RARITY_LEVELS.RARE_PRISM_STAR,

	// ACE SPEC Rare
	'ace spec rare': RARITY_LEVELS.ACE_SPEC_RARE,

	// Rare Rainbow
	'rare rainbow': RARITY_LEVELS.RARE_RAINBOW,
	'rainbow': RARITY_LEVELS.RARE_RAINBOW,

	// Rare Shining
	'rare shining': RARITY_LEVELS.RARE_SHINING,
	'shining': RARITY_LEVELS.RARE_SHINING,

	// Rare Shiny
	'rare shiny': RARITY_LEVELS.RARE_SHINY,
	'one shiny': RARITY_LEVELS.RARE_SHINY,

	// Rare Shiny GX
	'rare shiny gx': RARITY_LEVELS.RARE_SHINY_GX,
	'shiny gx': RARITY_LEVELS.RARE_SHINY_GX,

	// Shiny Rare
	'shiny rare': RARITY_LEVELS.SHINY_RARE,
	'shiny rare v': RARITY_LEVELS.SHINY_RARE,
	'shiny rare vmax': RARITY_LEVELS.SHINY_RARE,

	// Character Rare
	'character rare': RARITY_LEVELS.CHARACTER_RARE,
	'character super rare': RARITY_LEVELS.CHARACTER_SUPER_RARE,

	// Rare Ultra
	'rare ultra': RARITY_LEVELS.RARE_ULTRA,
	'one star': RARITY_LEVELS.RARE_ULTRA,

	// Ultra Rare
	'ultra rare': RARITY_LEVELS.ULTRA_RARE,
	'two star': RARITY_LEVELS.ULTRA_RARE,

	// Rare Secret
	'rare secret': RARITY_LEVELS.RARE_SECRET,
	'secret rare': RARITY_LEVELS.RARE_SECRET,
	'secret': RARITY_LEVELS.RARE_SECRET,
	'three star': RARITY_LEVELS.RARE_SECRET,

	// Shiny Ultra Rare
	'shiny ultra rare': RARITY_LEVELS.SHINY_ULTRA_RARE,
	'two shiny': RARITY_LEVELS.SHINY_ULTRA_RARE,

	// Radiant Rare
	'radiant rare': RARITY_LEVELS.RADIANT_RARE,
	'radiant': RARITY_LEVELS.RADIANT_RARE,

	// Amazing Rare
	'amazing rare': RARITY_LEVELS.AMAZING_RARE,
	'amazing': RARITY_LEVELS.AMAZING_RARE,

	// Black White Rare
	'black white rare': RARITY_LEVELS.BLACK_WHITE_RARE,

	// Hyper Rare
	'hyper rare': RARITY_LEVELS.HYPER_RARE,
	'golden': RARITY_LEVELS.HYPER_RARE,
	'gold': RARITY_LEVELS.HYPER_RARE,
	'mega hyper rare': RARITY_LEVELS.MEGA_HYPER_RARE,

	// Trainer Gallery Rare Holo
	'trainer gallery rare holo': RARITY_LEVELS.TRAINER_GALLERY_RARE_HOLO,
	'trainer gallery': RARITY_LEVELS.TRAINER_GALLERY_RARE_HOLO,

	// Illustration Rare
	'illustration rare': RARITY_LEVELS.ILLUSTRATION_RARE,
	'full art': RARITY_LEVELS.ILLUSTRATION_RARE,
	'full art trainer': RARITY_LEVELS.ILLUSTRATION_RARE,

	// Special Illustration Rare
	'special illustration rare': RARITY_LEVELS.SPECIAL_ILLUSTRATION_RARE,

	// LEGEND
	'legend': RARITY_LEVELS.LEGEND,

	// Crown
	'crown': RARITY_LEVELS.CROWN,
};

export function getRarityLevel(rarity: string): number {
	if (!rarity) return RARITY_LEVELS.UNKNOWN;

	const normalizedRarity = rarity.toLowerCase();

	// An exact match always wins: "one star" is a Pocket rarity, not a Holo Star.
	if (normalizedRarity in RARITY_MAPPING) {
		return RARITY_MAPPING[normalizedRarity];
	}

	// Otherwise fall back to the highest level any known rarity word matches.
	let highestLevel = RARITY_LEVELS.COMMON;

	for (const [key, value] of Object.entries(RARITY_MAPPING)) {
		if (normalizedRarity.includes(key) && value > highestLevel) {
			highestLevel = value;
		}
	}

	return highestLevel;
}
