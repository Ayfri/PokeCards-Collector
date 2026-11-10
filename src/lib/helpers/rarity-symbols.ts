import type { RARITY_SHAPES } from '#helpers/tcg-symbols.ts';

type RarityShape = keyof typeof RARITY_SHAPES;
export type RarityTone = 'gold' | 'ink' | 'pink' | 'silver';

interface RaritySymbolSpec {
	count: 1 | 2 | 3;
	shape: RarityShape;
	tone: RarityTone;
}

/** The printed symbols are black on a light card, so `ink` is a light gray to read on the dark UI. */
export const RARITY_TONES: Record<RarityTone, string> = {
	gold: 'fill-gold-400',
	ink: 'fill-gray-200',
	pink: 'fill-pink-400',
	silver: 'fill-slate-300'
};

const RARITY_GROUPS: [RaritySymbolSpec, string[]][] = [
	[{ count: 1, shape: 'circle', tone: 'ink' }, ['Common']],
	/** TCGdex gives no rarity for these cards: the circle is a default, not printed data. */
	[{ count: 1, shape: 'circle', tone: 'ink' }, ['None', '']],
	[{ count: 1, shape: 'diamond', tone: 'ink' }, ['Uncommon']],
	[{ count: 1, shape: 'star', tone: 'ink' }, [
		'Amazing Rare', 'Character Rare', 'Classic Collection', 'Full Art Trainer', 'Holo Rare', 'Holo Rare V', 'Holo Rare VMAX', 'Holo Rare VSTAR',
		'LEGEND', 'Pikachu Rare', 'Promo', 'Radiant Rare', 'Rare', 'Rare Holo', 'Rare Holo LV.X', 'Rare PRIME'
	]],
	[{ count: 2, shape: 'star', tone: 'ink' }, ['Double Rare']],
	[{ count: 3, shape: 'star', tone: 'ink' }, ['Triple Rare']],
	[{ count: 2, shape: 'starOutline', tone: 'silver' }, ['Character Super Rare', 'Ultra Rare']],
	[{ count: 1, shape: 'star', tone: 'gold' }, ['Black White Rare', 'Futuristic Rare', 'Illustration Rare', 'Mega Attack Rare', 'RGB Rare']],
	[{ count: 2, shape: 'star', tone: 'gold' }, ['Special Illustration Rare']],
	[{ count: 3, shape: 'star', tone: 'gold' }, ['Hyper Rare', 'Mega Hyper Rare', 'Secret Rare']],
	[{ count: 1, shape: 'shiny', tone: 'gold' }, ['Shiny Rare', 'Shiny Rare V', 'Shiny Rare VMAX']],
	[{ count: 2, shape: 'shiny', tone: 'gold' }, ['Shiny Ultra Rare']],
	[{ count: 1, shape: 'star', tone: 'pink' }, ['ACE SPEC Rare']]
];

/** Official symbol of each TCGdex rarity, keyed by its exact name. A rarity with no entry has no symbol. */
export const RARITY_SYMBOLS: Record<string, RaritySymbolSpec | undefined> = Object.fromEntries(
	RARITY_GROUPS.flatMap(([spec, rarities]) => rarities.map(rarity => [rarity, spec]))
);
