import * as fs from 'node:fs';
import {RARITY_MAPPING} from '$helpers/rarity';
import {envClient, ownedCardCodes} from '../supabase_sync';
import {CARDS, FR_CARDS, FR_PRICES, FR_SETS, JP_CARDS, JP_PRICES, JP_SETS, PRICES, SETS, TYPES} from '../files';
import type {MappedCard, MappedPrice, MappedSet} from './mappers';

export interface FileReport {
	cards: number;
	collisions: number;
	distinct: number;
	imageless: number;
	lang: string;
	priced: number;
	/** Set names used by more than one set. */
	sharedSetNames: string[];
	sets: number;
	/** Rarities missing from `RARITY_MAPPING`, supertypes outside Pokémon/Trainer/Energy and types missing from `types.json`. */
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

const LANGS = [
	{lang: 'en', cards: CARDS, prices: PRICES, sets: SETS},
	{lang: 'ja', cards: JP_CARDS, prices: JP_PRICES, sets: JP_SETS},
	{lang: 'fr', cards: FR_CARDS, prices: FR_PRICES, sets: FR_SETS},
] as const;

const SUPERTYPES = new Set(['Pokémon', 'Trainer', 'Energy']);

const read = <T>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8')) as T;

/**
 * Checks the scraped JSON before it is uploaded: no two cards may share a `card_code` (it is the
 * primary key everywhere), and every code a user owns should still resolve to a card.
 * Owned codes that do not resolve are reported, never deleted - they render again once TCGdex has the set.
 * A language whose cards file does not exist yet is skipped.
 */
export async function verifyFiles(checkOwned = true): Promise<VerifyReport> {
	const files: FileReport[] = [];
	const produced = new Set<string>();
	const crossCollisions = new Set<string>();
	const knownTypes = new Set(read<string[]>(TYPES));

	for (const {lang, cards: cardsPath, prices: pricesPath, sets: setsPath} of LANGS) {
		if (!fs.existsSync(cardsPath)) {
			console.log(`  ${lang}: ${cardsPath} does not exist, skipped`);
			continue;
		}
		const cards = read<MappedCard[]>(cardsPath);
		const prices = read<Record<string, MappedPrice>>(pricesPath);
		const sets = read<MappedSet[]>(setsPath);
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
			for (const type of card.types ? card.types.split(', ') : []) if (!knownTypes.has(type)) unknownValues.add(`type ${type}`);
		}

		files.push({
			cards: cards.length,
			collisions: cards.length - distinct.size,
			distinct: distinct.size,
			imageless: cards.filter(card => !card.image).length,
			lang,
			priced: Object.keys(prices).length,
			sharedSetNames: [...setNames].filter(([, count]) => count > 1).map(([name]) => name),
			sets: sets.length,
			unknownValues: [...unknownValues],
			unpriced: cards.filter(card => !prices[card.cardCode]).slice(0, 5).map(card => card.cardCode),
		});
	}

	const owned = checkOwned ? await ownedCardCodes(envClient()) : new Set<string>();
	return {crossCollisions: [...crossCollisions], files, missing: [...owned].filter(code => !produced.has(code)), owned: owned.size};
}
