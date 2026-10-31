import { cardPrice } from '#helpers/card-utils.ts';
import type { Language } from '#helpers/catalogues.ts';
import type { CatalogueData } from '#helpers/owned-cards.ts';
import type { Card, CollectionStats, PriceData, Set } from '#lib/types.js';

/** Number of owned cards the profile showcases, most valuable first. */
const SHOWCASE_SIZE = 6;

const roundCents = (value: number) => Math.round(value * 100) / 100;

interface CatalogueEntry {
	card: Card;
	/** Position in the catalogue: owned cards are summed in this order, so the float totals and the showcase ties match a full walk. */
	order: number;
	price: number;
	set: Set | undefined;
}

/**
 * What the stats need from one catalogue regardless of the user, built once instead of walking all ~21k cards on every profile view.
 * `cachedTable` hands out the same arrays until its hourly refresh, so the identity of the card list is the cache key.
 */
class CatalogueIndex {
	static readonly #built = new WeakMap<Card[], { index: CatalogueIndex; prices: Record<string, PriceData>; sets: Set[] }>();

	readonly byCode = new Map<string, CatalogueEntry>();
	/** Card count and value of every set, in catalogue order of first appearance. */
	readonly setTotals = new Map<string, { set: Set; total: number; totalValue: number }>();

	private constructor({ cards, prices, sets }: CatalogueData) {
		const setsById = new Map(sets.map(set => [set.setId, set]));
		cards.forEach((card, order) => {
			const set = setsById.get(card.setId);
			const price = cardPrice(prices[card.cardCode]) ?? 0;
			this.byCode.set(card.cardCode, { card, order, price, set });
			if (set === undefined) return;
			const totals = this.setTotals.get(set.name) ?? { set, total: 0, totalValue: 0 };
			totals.total++;
			totals.totalValue += price;
			this.setTotals.set(set.name, totals);
		});
	}

	static of(catalogue: CatalogueData) {
		const built = CatalogueIndex.#built.get(catalogue.cards);
		if (built?.sets === catalogue.sets && built.prices === catalogue.prices) return built.index;
		const index = new CatalogueIndex(catalogue);
		CatalogueIndex.#built.set(catalogue.cards, { index, prices: catalogue.prices, sets: catalogue.sets });
		return index;
	}
}

/**
 * Collection figures for a profile: copies and values count duplicates, rarities and set completion count distinct cards.
 * `catalogues` come in priority order (en, ja, fr): a code is read from the first one that holds it, and each language
 * keeps its own set checklists, since `Jungle` exists in English and in French.
 */
export function computeCollectionStats(
	collectionRows: { card_code: string }[],
	wishlistRows: { card_code: string }[],
	catalogues: (CatalogueData & { language: Language })[]
): CollectionStats {
	const indexes = catalogues.map(catalogue => ({ ...catalogue, index: CatalogueIndex.of(catalogue) }));
	const copies = new Map<string, number>();
	for (const { card_code } of collectionRows) copies.set(card_code, (copies.get(card_code) ?? 0) + 1);

	const owned = [...copies]
		.flatMap(([code, count]) => {
			const rank = indexes.findIndex(({ index }) => index.byCode.has(code));
			return rank < 0 ? [] : [{ ...indexes[rank].index.byCode.get(code)!, copies: count, language: indexes[rank].language, rank }];
		})
		.sort((a, b) => a.rank - b.rank || a.order - b.order);

	const cardsByRarity: Record<string, number> = {};
	const ownedBySet = new Map<string, { collectedValue: number; count: number }>();
	let totalValue = 0;
	for (const { card, copies: count, language, price, set } of owned) {
		totalValue += price * count;
		cardsByRarity[card.rarity] = (cardsByRarity[card.rarity] ?? 0) + 1;
		if (set === undefined) continue;
		const key = `${language}:${set.name}`;
		const completion = ownedBySet.get(key) ?? { collectedValue: 0, count: 0 };
		completion.count++;
		completion.collectedValue += price;
		ownedBySet.set(key, completion);
	}

	/** Sets are only listed once one of their cards is owned. */
	const setCompletion: CollectionStats['set_completion'] = {};
	for (const { index, language } of indexes) {
		for (const [name, { set, total, totalValue: setValue }] of index.setTotals) {
			const key = `${language}:${name}`;
			const completion = ownedBySet.get(key);
			if (!completion) continue;
			setCompletion[key] = {
				collectedValue: roundCents(completion.collectedValue),
				count: completion.count,
				language,
				name,
				percentage: (completion.count / total) * 100,
				set,
				total,
				totalValue: roundCents(setValue),
			};
		}
	}

	return {
		cards_by_rarity: cardsByRarity,
		set_completion: setCompletion,
		top_cards: owned
			.filter(({ price }) => price > 0)
			.sort((a, b) => b.price - a.price)
			.slice(0, SHOWCASE_SIZE)
			.map(({ card, copies, language, price }) => ({ card: { ...card, language }, copies, price })),
		total_instances: collectionRows.length,
		total_value: roundCents(totalValue),
		unique_cards: copies.size,
		wishlist_count: wishlistRows.length,
		wishlist_total_value: roundCents(wishlistRows.reduce((sum, item) => sum + (cardPrice(catalogues.find(({ prices }) => prices[item.card_code])?.prices[item.card_code]) ?? 0), 0)),
	};
}
