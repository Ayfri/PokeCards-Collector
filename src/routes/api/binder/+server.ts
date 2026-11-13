import { cardPrice } from '#helpers/card-utils.ts';
import { compressedJsonResponse, memoizedJson } from '#helpers/grid-payload.ts';
import { getCards, getPrices, getSets } from '#helpers/catalogue-data.ts';
import type { BinderCatalogueCard, BinderPayload, BinderSet } from '#lib/types.js';
import type { RequestHandler } from './$types';

/**
 * Only the fields the binder draws: a fifth of the weight of the full cards plus price tables, and cacheable. The sets ride along, so the page
 * document carries none of them: only the sets that hold a card are listed, newest first, each with the number of cards the catalogue really has.
 */
export const GET: RequestHandler = async ({ request }) => {
	const [cards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);

	const body = await memoizedJson('binder', cards, [prices, sets], (): BinderPayload => {
		const totals = new Map<string, number>();
		for (const { setId } of cards) totals.set(setId, (totals.get(setId) ?? 0) + 1);

		return {
			cards: cards.map((card): BinderCatalogueCard => ({
				cardCode: card.cardCode,
				image: card.image,
				localId: card.localId,
				name: card.name,
				price: cardPrice(prices[card.cardCode]),
				rarity: card.rarity,
				setId: card.setId,
				setName: card.setName,
				types: card.types,
			})),
			sets: sets
				.filter(set => totals.has(set.setId))
				.map((set): BinderSet => ({
					name: set.name,
					printedTotal: set.printedTotal,
					releaseDate: set.releaseDate.toISOString().slice(0, 10),
					setId: set.setId,
					symbol: set.symbol ?? '',
					total: totals.get(set.setId) ?? 0,
				}))
				.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.name.localeCompare(b.name)),
		};
	});

	return compressedJsonResponse(request, body);
};
