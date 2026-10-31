import { cardPrice } from '$helpers/card-utils';
import type { Card, CollectionStats, PriceData, Set } from '$lib/types';

/** Number of owned cards the profile showcases, most valuable first. */
const SHOWCASE_SIZE = 6;

const roundCents = (value: number) => Math.round(value * 100) / 100;

interface CatalogueEntry {
	card: Card;
	/** Position in the catalogue: owned cards are summed in this order, so the float totals and the showcase ties match a full walk. */
	order: number;
	price: number;
	setName: string | undefined;
}

/**
 * What the stats need from the catalogue regardless of the user, built once instead of walking all ~21k cards on every profile view.
 * `cachedTable` hands out the same arrays until its hourly refresh, so their identity is the cache key.
 */
class CatalogueIndex {
	static #last: { cards: Card[]; index: CatalogueIndex; prices: Record<string, PriceData>; sets: Set[] } | undefined;

	readonly byCode = new Map<string, CatalogueEntry>();
	/** Card count and value of every set, in catalogue order of first appearance. */
	readonly setTotals = new Map<string, { total: number; totalValue: number }>();

	private constructor(cards: Card[], sets: Set[], prices: Record<string, PriceData>) {
		const setsById = new Map(sets.map(set => [set.setId, set]));
		cards.forEach((card, order) => {
			const setName = setsById.get(card.setId)?.name;
			const price = cardPrice(prices[card.cardCode]) ?? 0;
			this.byCode.set(card.cardCode, { card, order, price, setName });
			if (setName === undefined) return;
			const totals = this.setTotals.get(setName) ?? { total: 0, totalValue: 0 };
			totals.total++;
			totals.totalValue += price;
			this.setTotals.set(setName, totals);
		});
	}

	static of(cards: Card[], sets: Set[], prices: Record<string, PriceData>) {
		const last = CatalogueIndex.#last;
		if (last?.cards === cards && last.sets === sets && last.prices === prices) return last.index;
		const index = new CatalogueIndex(cards, sets, prices);
		CatalogueIndex.#last = { cards, index, prices, sets };
		return index;
	}
}

/** Collection figures for a profile: copies and values count duplicates, rarities and set completion count distinct cards. */
export function computeCollectionStats(
	collectionRows: { card_code: string }[],
	wishlistRows: { card_code: string }[],
	cards: Card[],
	sets: Set[],
	prices: Record<string, PriceData>
): CollectionStats {
	const index = CatalogueIndex.of(cards, sets, prices);
	const copies = new Map<string, number>();
	for (const { card_code } of collectionRows) copies.set(card_code, (copies.get(card_code) ?? 0) + 1);

	const owned = [...copies]
		.flatMap(([code, count]) => {
			const entry = index.byCode.get(code);
			return entry ? [{ ...entry, copies: count }] : [];
		})
		.sort((a, b) => a.order - b.order);

	const cardsByRarity: Record<string, number> = {};
	const ownedBySet = new Map<string, { collectedValue: number; count: number }>();
	let totalValue = 0;
	for (const { card, copies: count, price, setName } of owned) {
		totalValue += price * count;
		cardsByRarity[card.rarity] = (cardsByRarity[card.rarity] ?? 0) + 1;
		if (setName === undefined) continue;
		const completion = ownedBySet.get(setName) ?? { collectedValue: 0, count: 0 };
		completion.count++;
		completion.collectedValue += price;
		ownedBySet.set(setName, completion);
	}

	/** Sets are only listed once one of their cards is owned. */
	const setCompletion: CollectionStats['set_completion'] = {};
	for (const [name, { total, totalValue: setValue }] of index.setTotals) {
		const completion = ownedBySet.get(name);
		if (!completion) continue;
		setCompletion[name] = {
			collectedValue: roundCents(completion.collectedValue),
			count: completion.count,
			percentage: (completion.count / total) * 100,
			total,
			totalValue: roundCents(setValue),
		};
	}

	return {
		cards_by_rarity: cardsByRarity,
		set_completion: setCompletion,
		top_cards: owned
			.filter(({ price }) => price > 0)
			.sort((a, b) => b.price - a.price)
			.slice(0, SHOWCASE_SIZE)
			.map(({ card, copies, price }) => ({ card, copies, price })),
		total_instances: collectionRows.length,
		total_value: roundCents(totalValue),
		unique_cards: copies.size,
		wishlist_count: wishlistRows.length,
		wishlist_total_value: roundCents(wishlistRows.reduce((sum, item) => sum + (cardPrice(prices[item.card_code]) ?? 0), 0)),
	};
}
