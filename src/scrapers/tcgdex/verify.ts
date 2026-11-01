import * as fs from 'node:fs';
import {cardSlug, SUBTYPE_SECTIONS, setSlug} from '#helpers/card-utils.ts';
import {RARITY_MAPPING} from '#helpers/rarity.ts';
import {envClient, FILES, TYPES} from '../cli-config';
import {ownedCardCodes} from '../supabase_sync';
import type {MappedCard, MappedPrice, MappedSet} from './mappers';

export interface FileReport {
	cards: number;
	collisions: number;
	distinct: number;
	imageless: number;
	lang: string;
	/** Japanese only: twin ids (`twinTcgdexId`) that no English card carries, so the twin link would lead nowhere. */
	missingTwins: string[];
	priced: number;
	/** Set names used by more than one set. */
	sharedSetNames: string[];
	sets: number;
	/** Card slugs (`cardSlug`) shared by several `card_code`s and set slugs (`setSlug`, prefixed `set:`) shared by several set ids: their public URLs would collide. */
	slugCollisions: string[];
	/** Rarities missing from `RARITY_MAPPING`, supertypes outside Pokémon/Trainer/Energy, subtypes outside `SUBTYPE_SECTIONS` and types missing from `types.json`. */
	unknownValues: string[];
	unpriced: string[];
}

export interface VerifyReport {
	/** Card codes produced by more than one language. */
	crossCollisions: string[];
	files: FileReport[];
	missing: string[];
	owned: number;
}

/** English first: its ids are needed to check the Japanese twin ids. */
const LANGS = ['en', 'ja', 'fr'] as const;

const SUPERTYPES = new Set(['Pokémon', 'Trainer', 'Energy']);
const SUBTYPES = new Set<string>(SUBTYPE_SECTIONS.map(section => section.subtype));

const read = <T>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8')) as T;

/** `slug (id, id)` for each slug that more than one distinct id produces. */
function sharedSlugs(entries: Iterable<[slug: string, id: string]>): string[] {
	const ids = new Map<string, Set<string>>();
	for (const [slug, id] of entries) ids.set(slug, (ids.get(slug) ?? new Set<string>()).add(id));
	return [...ids].filter(([, found]) => found.size > 1).map(([slug, found]) => `${slug} (${[...found].join(', ')})`);
}

/**
 * Checks the scraped JSON before it is uploaded: no two cards may share a `card_code` (it is the join key
 * everywhere), and every code a user owns should still resolve to a card.
 * Owned codes that do not resolve are reported, never deleted: they render again once TCGdex has the set.
 * A language whose cards file does not exist yet is skipped.
 */
export async function verifyFiles(checkOwned = true): Promise<VerifyReport> {
	const files: FileReport[] = [];
	const produced = new Set<string>();
	const crossCollisions = new Set<string>();
	const knownTypes = new Set(read<string[]>(TYPES));
	/** Empty without the English file, which skips the twin check. */
	const englishIds = new Set<string>();

	for (const lang of LANGS) {
		const {cards: cardsPath, prices: pricesPath, sets: setsPath} = FILES[lang];
		if (!fs.existsSync(cardsPath)) {
			console.log(`  ${lang}: ${cardsPath} does not exist, skipped`);
			continue;
		}
		const cards = read<MappedCard[]>(cardsPath);
		const prices = read<Record<string, MappedPrice>>(pricesPath);
		const sets = read<MappedSet[]>(setsPath);
		if (lang === 'en') for (const card of cards) englishIds.add(card.tcgdexId);
		const distinct = new Set(cards.map(card => card.cardCode));
		for (const code of distinct) {
			if (produced.has(code)) crossCollisions.add(code);
			produced.add(code);
		}

		const setNames = new Map<string, number>();
		for (const set of sets) setNames.set(set.name, (setNames.get(set.name) ?? 0) + 1);

		const unknownValues = new Set<string>();
		for (const card of cards) {
			if (!(card.rarity.toLowerCase() in RARITY_MAPPING)) unknownValues.add(`rarity ${card.rarity}`);
			if (!SUPERTYPES.has(card.supertype)) unknownValues.add(`supertype ${card.supertype}`);
			if (card.subtype && !SUBTYPES.has(card.subtype)) unknownValues.add(`subtype ${card.subtype}`);
			for (const type of card.types ? card.types.split(', ') : []) if (!knownTypes.has(type)) unknownValues.add(`type ${type}`);
		}

		files.push({
			cards: cards.length,
			collisions: cards.length - distinct.size,
			distinct: distinct.size,
			imageless: cards.filter(card => !card.image).length,
			lang,
			missingTwins: lang === 'ja' && englishIds.size ? cards.flatMap(card => card.twinTcgdexId && !englishIds.has(card.twinTcgdexId) ? [`${card.tcgdexId} -> ${card.twinTcgdexId}`] : []) : [],
			priced: Object.keys(prices).length,
			sharedSetNames: [...setNames].filter(([, count]) => count > 1).map(([name]) => name),
			sets: sets.length,
			slugCollisions: [
				...sharedSlugs(cards.map((card): [string, string] => [cardSlug(card, lang), card.cardCode])),
				...sharedSlugs(sets.map((set): [string, string] => [setSlug(set, lang), set.setId])).map(slug => `set:${slug}`),
			],
			unknownValues: [...unknownValues],
			unpriced: cards.filter(card => !prices[card.cardCode]).slice(0, 5).map(card => card.cardCode),
		});
	}

	const owned = checkOwned ? await ownedCardCodes(envClient()) : new Set<string>();
	return {crossCollisions: [...crossCollisions], files, missing: [...owned].filter(code => !produced.has(code)), owned: owned.size};
}
