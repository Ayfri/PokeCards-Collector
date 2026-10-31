import type {TcgdexCard} from './types';

/** TCGdex localizes these four enumerations while the filters, RARITY_MAPPING and the card codes expect English values. */
export const FRENCH = {
	category: {Dresseur: 'Trainer', Énergie: 'Energy', Pokémon: 'Pokemon'},
	rarity: {
		'Chromatique ultra rare': 'Shiny Ultra Rare',
		'Collection Classique': 'Classic Collection',
		'Commune': 'Common',
		'Couronne': 'Crown',
		'Deux Chromatiques': 'Two Shiny',
		'Deux Diamants': 'Two Diamond',
		'Deux Étoiles': 'Two Star',
		'Dresseur Full Art': 'Full Art Trainer',
		'HIGH-TECH rare': 'ACE SPEC Rare',
		'Illustration spéciale rare': 'Special illustration rare',
		'LÉGENDE': 'LEGEND',
		'Magnifique': 'Amazing Rare',
		'Magnifique rare': 'Secret Rare',
		'Méga Hyper Rare': 'Mega Hyper Rare',
		'Peu Commune': 'Uncommon',
		'Quatre Diamants': 'Four Diamond',
		'Radieux Rare': 'Radiant Rare',
		'Rare Noir Blanc': 'Black White Rare',
		'Rare Prime': 'Rare PRIME',
		'Sans Rareté': 'None',
		'Trois Diamants': 'Three Diamond',
		'Trois Étoiles': 'Three Star',
		'Un Chromatique': 'One Shiny',
		'Un Diamant': 'One Diamond',
		'Une Étoile': 'One Star',
	},
	stage: {'Bébé': 'Baby', 'Base': 'Basic', 'MÉGA': 'MEGA', 'Niveau 1': 'Stage1', 'Niveau 2': 'Stage2', 'Niveau Sup': 'LEVEL-UP', 'Restauré': 'RESTORED', 'TURBO': 'BREAK'},
	type: {
		Combat: 'Fighting',
		Eau: 'Water',
		Feu: 'Fire',
		Fée: 'Fairy',
		Incolore: 'Colorless',
		Métal: 'Metal',
		Obscurité: 'Darkness',
		Plante: 'Grass',
		Psy: 'Psychic',
		Électrique: 'Lightning',
	},
} satisfies Record<string, Record<string, string>>;

const translate = (table: Record<string, string>, value: string): string => table[value] ?? value;

/** A value missing from `FRENCH` passes through unchanged. */
export function toEnglish(card: TcgdexCard): TcgdexCard {
	return {
		...card,
		category: card.category && translate(FRENCH.category, card.category),
		rarity: card.rarity && translate(FRENCH.rarity, card.rarity),
		stage: card.stage && translate(FRENCH.stage, card.stage),
		types: card.types?.map(type => translate(FRENCH.type, type)),
	};
}
