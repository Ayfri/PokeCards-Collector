import type {FullCard} from '#lib/types.js';

export type PlateKind = 'energy' | 'pokemon' | 'trainer';

export interface PlateIdentity {
	/** Key of the icon the plate draws: an energy type, a Trainer kind (`supporter`, `item`, `stadium`, `tool`, `trainer`) or a finer Trainer glyph (`ball`, `potion`, `fossil`, `machine`), empty for a Pokémon. */
	emblem: string;
	kind: PlateKind;
	/** What the card is, in a word or two: `Basic Energy`, `Supporter`, `Trainer`. Empty for a Pokémon. */
	label: string;
	/** True for a Special Energy, which gets a gold ring around its emblem. */
	special: boolean;
	/** Comma-separated energy types that color the plate through `cardTypeTint`, empty to keep the plain gray. */
	tint: string;
	/** The energy types the footer lists. */
	typeNames: string[];
}

const ENERGY_TYPES = ['colorless', 'darkness', 'dragon', 'fairy', 'fighting', 'fire', 'grass', 'lightning', 'metal', 'psychic', 'water'];
const ENERGY_TYPE = new RegExp(`\\b(${ENERGY_TYPES.join('|')})\\b`, 'i');
const BASIC_ENERGY = new RegExp(`^(basic )?(${ENERGY_TYPES.join('|')}) energy$`, 'i');

/** The Trainer kinds, each tinted with the energy color that reads best next to the others. */
const TRAINER_TINTS: Record<string, string> = {item: 'water', stadium: 'grass', supporter: 'fire', tool: 'psychic', trainer: 'metal'};

/** The card's `subtype` (`Supporter`, `Item`, `Normal`, `Special`...) wins over the name guesses below, which only cover cards that have none. */
function subtypeOf(card: FullCard): string {
	return card.subtype?.toLowerCase() ?? '';
}

/**
 * Only the names that are unambiguous in English are guessed, each with the Trainer kind it implies and a more
 * specific icon than the kind's own: any other Trainer stays a plain `trainer` rather than risking a wrong label.
 */
const TRAINER_NAME_RULES: [RegExp, string, string][] = [
	[/\bball$/i, 'item', 'ball'],
	[/\bpotion$/i, 'item', 'potion'],
	[/\bfossil$/i, 'item', 'fossil'],
	[/^technical machine/i, 'tool', 'machine'],
	[/\btool$/i, 'tool', 'tool'],
	[/\bstadium$/i, 'stadium', 'stadium']
];

function trainerKind(card: FullCard): {emblem: string; kind: string} {
	const declared = Object.keys(TRAINER_TINTS).find(kind => subtypeOf(card).includes(kind));
	const rule = TRAINER_NAME_RULES.find(([pattern]) => pattern.test(card.name));
	if (declared) return {emblem: rule?.[1] === declared ? rule[2] : declared, kind: declared};
	return rule ? {emblem: rule[2], kind: rule[1]} : {emblem: 'trainer', kind: 'trainer'};
}

/** What the placeholder of a card with no scan shows: its kind, the icon standing for it and the color it takes. */
export function plateIdentity(card: FullCard | undefined, types: string | undefined): PlateIdentity {
	const listed = (card?.types ?? types ?? '').split(',').map(type => type.trim()).filter(Boolean);

	if (card?.supertype === 'Energy') {
		const energyType = ENERGY_TYPES.find(type => type === listed[0]?.toLowerCase()) ?? card.name.match(ENERGY_TYPE)?.[1]?.toLowerCase() ?? '';
		const declared = subtypeOf(card);
		const special = declared ? declared.includes('special') : !BASIC_ENERGY.test(card.name);
		return {
			emblem: energyType || 'rainbow',
			kind: 'energy',
			label: special ? 'Special Energy' : 'Basic Energy',
			special,
			tint: listed.length ? listed.join(', ') : energyType,
			typeNames: listed.length ? listed : energyType ? [energyType] : []
		};
	}

	if (card?.supertype === 'Trainer') {
		const {emblem, kind} = trainerKind(card);
		return {
			emblem,
			kind: 'trainer',
			label: kind === 'trainer' ? 'Trainer' : kind.charAt(0).toUpperCase() + kind.slice(1),
			special: false,
			tint: TRAINER_TINTS[kind] ?? '',
			typeNames: []
		};
	}

	return {emblem: '', kind: 'pokemon', label: '', special: false, tint: listed.join(', '), typeNames: listed};
}
