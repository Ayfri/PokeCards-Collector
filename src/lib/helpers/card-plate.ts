import type {Language} from '#helpers/catalogues.ts';
import type {FullCard} from '#lib/types.js';

export type PlateKind = 'energy' | 'pokemon' | 'trainer';

export interface PlateIdentity {
	/** The energy color of a Trainer's kind pill and emblem (`water` for an Item), empty for other cards. */
	accent: string;
	/** The `TRAINER` banner a Trainer card prints in its top-left corner, in the card's language, empty for other cards. */
	banner: string;
	/** Key of the icon the plate draws: an energy type, a Trainer kind (`supporter`, `item`, `stadium`, `tool`, `trainer`) or a finer Trainer glyph (`ball`, `potion`, `fossil`, `machine`), empty for a Pokémon. */
	emblem: string;
	kind: PlateKind;
	/** What the card is, in a word or two: `Basic Energy`, `Supporter`, `Trainer`. Empty for a Pokémon. */
	label: string;
	/** True for a Special Energy, which gets a gold ring around its emblem. */
	special: boolean;
	/** Comma-separated energy types that color the plate through `cardTypeTint`, empty to keep the plain gray (or the silver of a Trainer). */
	tint: string;
	/** The energy types the footer lists. */
	typeNames: string[];
}

const ENERGY_TYPES = ['colorless', 'darkness', 'dragon', 'fairy', 'fighting', 'fire', 'grass', 'lightning', 'metal', 'psychic', 'water'];
const ENERGY_TYPE = new RegExp(`\\b(${ENERGY_TYPES.join('|')})\\b`, 'i');
const BASIC_ENERGY = new RegExp(`^(basic )?(${ENERGY_TYPES.join('|')}) energy$`, 'i');

/** The Trainer kinds with the energy color of the pill a printed card names them in: Item blue, Stadium green, Supporter orange, Pokémon Tool purple. */
const TRAINER_ACCENTS: Record<string, string> = {item: 'water', stadium: 'grass', supporter: 'fire', tool: 'psychic', trainer: 'metal'};

/** A printed Trainer card has a silver body whatever its kind, with only its kind pill in color. */
export const TRAINER_BODY = '--tint-a: #dfe2e6; --tint-b: #a9aeb6';

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
	const declared = Object.keys(TRAINER_ACCENTS).find(kind => subtypeOf(card).includes(kind));
	const rule = TRAINER_NAME_RULES.find(([pattern]) => pattern.test(card.name));
	if (declared) return {emblem: rule?.[1] === declared ? rule[2] : declared, kind: declared};
	return rule ? {emblem: rule[2], kind: rule[1]} : {emblem: 'trainer', kind: 'trainer'};
}

/** Rarities printed as full art: the illustration covers the whole card, so a borrowed scan fills the plate instead of being cropped to the standard illustration box. */
export const FULL_ART_RARITIES: ReadonlySet<string> = new Set([
	'Character Rare',
	'Character Super Rare',
	'Full Art Trainer',
	'Hyper Rare',
	'Illustration Rare',
	'Mega Hyper Rare',
	'Secret Rare',
	'Shiny Ultra Rare',
	'Special Illustration Rare',
	'Ultra Rare'
]);

/** The energy types whose body is too dark for the black header text of a printed card (under ~3.7:1 contrast), so the plate writes it in white there. */
export const DARK_BODY_TYPES: ReadonlySet<string> = new Set(['darkness', 'dragon', 'psychic']);

const sameInEveryLanguage = (label: string): Record<Language, string> => ({en: label, fr: label, ja: label});

/** The stored `stage` values with the label printed on the card in each catalogue's language: the plate mimics the card, so `Stage1` reads `Niveau 1` on a French one. */
const STAGE_LABELS: Record<string, Record<Language, string>> = {
	Baby: {en: 'Baby', fr: 'Bébé', ja: 'Baby'},
	Basic: {en: 'Basic', fr: 'Base', ja: 'たね'},
	BREAK: sameInEveryLanguage('BREAK'),
	'LEVEL-UP': sameInEveryLanguage('LV.X'),
	MEGA: sameInEveryLanguage('MEGA'),
	RESTORED: {en: 'Restored', fr: 'Restauré', ja: 'Restored'},
	Stage1: {en: 'Stage 1', fr: 'Niveau 1', ja: '1進化'},
	Stage2: {en: 'Stage 2', fr: 'Niveau 2', ja: '2進化'},
	'V-UNION': sameInEveryLanguage('V-UNION'),
	VMAX: sameInEveryLanguage('VMAX'),
	VSTAR: sameInEveryLanguage('VSTAR')
};

/** The printed label of a stored stage, the raw value for one the table does not know, empty for none. */
export function stageLabel(stage: string | undefined, language: Language): string {
	return stage ? (STAGE_LABELS[stage]?.[language] ?? stage) : '';
}

/** What a Trainer or Energy card is called on the printed card, in each catalogue's language, by kind key (`machine`, `basic`...). The secret machine only has its English print. */
const KIND_LABELS: Record<string, Record<Language, string>> = {
	basic: {en: 'Basic Energy', fr: 'Énergie de base', ja: '基本エネルギー'},
	item: {en: 'Item', fr: 'Objet', ja: 'グッズ'},
	machine: {en: 'Technical Machine', fr: 'Machine Technique', ja: 'わざマシン'},
	rocket: sameInEveryLanguage("Rocket's Secret Machine"),
	special: {en: 'Special Energy', fr: 'Énergie spéciale', ja: '特殊エネルギー'},
	stadium: {en: 'Stadium', fr: 'Stade', ja: 'スタジアム'},
	supporter: {en: 'Supporter', fr: 'Supporter', ja: 'サポート'},
	tool: {en: 'Pokémon Tool', fr: 'Outil Pokémon', ja: 'ポケモンのどうぐ'},
	trainer: {en: 'Trainer', fr: 'Dresseur', ja: 'トレーナーズ'}
};

/** English and French set ids (`sv03`, `me01`, `svp`, `2023sv`, `30th`) of the Scarlet & Violet era and later. */
const SILVER_BORDER_SETS = /^(?:20\d\dsv|30th|me|sv)/i;
/** Japanese set ids (`SV3`, `M2a`, `SV-P`, `M-P`, `MC`) of the same era. Case-sensitive: with the `i` flag `m(?:\d|-p|c$|f)` also matched the English `mfb` (My First Battle, 2016). */
const SILVER_BORDER_JA_SETS = /^M(?:\d|-P|C$|F)/;

/**
 * The card border turned from yellow to silver with Scarlet & Violet (2023), so the plate frame follows the card's era.
 * Each new era needs a new prefix in the two patterns above: an unlisted set id keeps the yellow border.
 */
export function hasSilverBorder(card: FullCard | undefined): boolean {
	const setId = card?.setId ?? '';
	return SILVER_BORDER_SETS.test(setId) || SILVER_BORDER_JA_SETS.test(setId);
}

function hashOf(text: string): number {
	let hash = 2166136261;
	for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	return hash >>> 0;
}

/** The mottled texture of a printed card body, one SVG per seed: a few seeds only, so every plate of a set shares one decoded image instead of rasterizing its own noise. */
const TEXTURE_SEEDS = 16;

const grayMatrix = (gain: number, alpha: number) => `${gain} 0 0 0 ${(0.5 - gain / 2).toFixed(2)} `.repeat(3) + `0 0 0 0 ${alpha}`;

/** The 16 texture images as CSS `url()` values, built once at import so a plate only picks one instead of encoding an SVG on every mount. */
const TEXTURE_URLS = Array.from({length: TEXTURE_SEEDS}, (_, seed) => {
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" preserveAspectRatio="none"><filter id="f" x="0" y="0" width="1" height="1">` +
		`<feTurbulence baseFrequency=".011 .008" numOctaves="3" seed="${seed}" type="fractalNoise"/><feColorMatrix values="${grayMatrix(1.7, 1)}" result="a"/>` +
		`<feTurbulence baseFrequency=".55" numOctaves="2" seed="${seed + 40}" type="fractalNoise"/><feColorMatrix values="${grayMatrix(1.8, 0.22)}"/>` +
		`<feMerge><feMergeNode in="a"/><feMergeNode/></feMerge></filter><rect filter="url(#f)" height="420" width="300"/></svg>`;
	return `url('data:image/svg+xml,${encodeURIComponent(svg).replaceAll("'", '%27')}')`;
});

/**
 * Inline custom properties for the plate body: a grayscale `feTurbulence` image (soft blotches plus fine speckles) that the stylesheet blends into the type color.
 * The seed comes from the set, so a set keeps one look like its printed cards, and a small per-card shift of the pattern comes from the card code.
 * Both are hashes, so the server and the client render the same plate.
 */
export function plateTexture(card: FullCard | undefined): string {
	if (!card) return '';
	const shift = hashOf(card.cardCode);
	return `--plate-texture: ${TEXTURE_URLS[hashOf(card.setId) % TEXTURE_SEEDS]}; --plate-shift: ${shift % 100}% ${(shift >>> 9) % 100}%`;
}

const LANGUAGE_NAMES = new Intl.DisplayNames('en', {type: 'language'});

/** The chip naming where a plate's borrowed artwork comes from (`Art: German print`, `Art: reprint`, `Art: basic Energy`), empty for a source it does not know. */
export function artNote(source: string | undefined): string {
	const [kind, value = ''] = (source ?? '').split(':');
	if (kind === 'lang') return `Art: ${LANGUAGE_NAMES.of(value) ?? value} print`;
	return kind === 'reprint' ? 'Art: reprint' : kind === 'energy' ? 'Art: basic Energy' : '';
}

/** What the placeholder of a card with no scan shows: its kind, the icon standing for it and the color it takes. */
export function plateIdentity(card: FullCard | undefined, types: string | undefined, language: Language = 'en'): PlateIdentity {
	const listed = (card?.types ?? types ?? '').split(',').map(type => type.trim()).filter(Boolean);

	if (card?.supertype === 'Energy') {
		const energyType = ENERGY_TYPES.find(type => type === listed[0]?.toLowerCase()) ?? card.name.match(ENERGY_TYPE)?.[1]?.toLowerCase() ?? '';
		const declared = subtypeOf(card);
		const special = declared ? declared.includes('special') : !BASIC_ENERGY.test(card.name);
		return {
			accent: '',
			banner: '',
			emblem: energyType || 'rainbow',
			kind: 'energy',
			label: KIND_LABELS[special ? 'special' : 'basic'][language],
			special,
			tint: listed.length ? listed.join(', ') : energyType,
			typeNames: listed.length ? listed : energyType ? [energyType] : []
		};
	}

	if (card?.supertype === 'Trainer') {
		const {emblem, kind} = trainerKind(card);
		const declared = subtypeOf(card);
		const labelKey = declared.includes('rocket') ? 'rocket' : declared.includes('technical machine') || emblem === 'machine' ? 'machine' : kind;
		return {
			accent: TRAINER_ACCENTS[kind] ?? 'metal',
			banner: KIND_LABELS.trainer[language],
			emblem,
			kind: 'trainer',
			label: KIND_LABELS[labelKey][language],
			special: false,
			tint: '',
			typeNames: []
		};
	}

	return {accent: '', banner: '', emblem: '', kind: 'pokemon', label: '', special: false, tint: listed.join(', '), typeNames: listed};
}
