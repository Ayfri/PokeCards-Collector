import type { Language } from '#helpers/catalogues.ts';
import type { OwnedCard, OwnedCards } from '#helpers/supabase-data.ts';
import type { CollectionStats, Set } from '#lib/types.js';

/** Number of owned cards the profile showcases, most valuable first. */
const SHOWCASE_SIZE = 6;

const roundCents = (value: number) => Math.round(value * 100) / 100;

/** A French code always has a `fr`-prefixed set part (`pokemon_6_frsv03_125`) and no English or Japanese code does, so the code alone says which table holds it. */
export const isFrenchCode = (code: string) => /^[^_]+_\d+_fr/.test(code);

/** The numbers every user page draws: copies and value count duplicates, `uniqueCards` the distinct codes, orphan rows included. */
export function ownedTotals({ cards, codes, rows }: OwnedCards): { copies: number; top: (OwnedCard & { price: number })[]; totalValue: number; uniqueCards: number } {
	return {
		copies: rows,
		top: cards.filter((card): card is OwnedCard & { price: number } => (card.price ?? 0) > 0).sort((a, b) => b.price - a.price).slice(0, SHOWCASE_SIZE),
		totalValue: roundCents(cards.reduce((sum, { copies, price }) => sum + (price ?? 0) * copies, 0)),
		uniqueCards: codes,
	};
}

/**
 * Collection figures for a profile: copies and values count duplicates, rarities and set completion count distinct cards.
 * `sets` holds the set list of each language the collection touches: set ids repeat across languages (`base1` exists in English and in French),
 * and two Japanese sets can share a name, so a checklist is keyed on language plus set id. A set missing from `sets` has no checklist.
 */
export function collectionStats(collection: OwnedCards, wishlist: OwnedCards, sets: Partial<Record<Language, Set[]>>): CollectionStats {
	const { copies, top, totalValue, uniqueCards } = ownedTotals(collection);
	const cardsByRarity: Record<string, number> = {};
	const ownedBySet = new Map<string, { collectedValue: number; count: number }>();

	for (const { language, price, rarity, setId } of collection.cards) {
		cardsByRarity[rarity] = (cardsByRarity[rarity] ?? 0) + 1;
		const key = `${language}:${setId}`;
		const completion = ownedBySet.get(key) ?? { collectedValue: 0, count: 0 };
		completion.count++;
		completion.collectedValue += price ?? 0;
		ownedBySet.set(key, completion);
	}

	const setCompletion: CollectionStats['set_completion'] = {};
	for (const { cards: total, language, set_id, value } of collection.sets) {
		const key = `${language}:${set_id}`;
		const completion = ownedBySet.get(key);
		const set = sets[language]?.find(({ setId }) => setId === set_id);
		if (!completion || !set) continue;
		setCompletion[key] = {
			collectedValue: roundCents(completion.collectedValue),
			count: completion.count,
			language,
			name: set.name,
			percentage: (completion.count / total) * 100,
			set,
			total,
			totalValue: roundCents(value),
		};
	}

	return {
		cards_by_rarity: cardsByRarity,
		set_completion: setCompletion,
		top_cards: top.map(({ copies, price, ...card }) => ({ card, copies, price })),
		total_instances: copies,
		total_value: totalValue,
		unique_cards: uniqueCards,
		wishlist_count: wishlist.rows,
		wishlist_total_value: ownedTotals(wishlist).totalValue,
	};
}
