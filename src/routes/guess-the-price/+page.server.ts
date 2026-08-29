import type { PageServerLoad } from './$types';
import { breadcrumbs, gameSchema } from '$helpers/seo';
import type { Card, PriceData, Set } from '$lib/types';

/** One playable card: the art to show, the price to guess and the set date shown as a hint. */
export interface Round {
	card: Card;
	price: number;
	releaseDate: Date | null;
}

/** Shared by both exits of the load, so a page with no playable card still ships a full head. */
const SEO = {
	breadcrumbs: breadcrumbs({ name: 'Guess the Price', url: '/guess-the-price' }),
	description: 'Guess what a Pokémon card is worth on Cardmarket. Real cards, real euro prices, a new set of rounds every time. Free and playable without an account.',
	keywords: ['guess the price', 'Pokémon card price game', 'Pokémon TCG game', 'card value quiz'],
	schemas: [gameSchema('Guess the Price', 'A Pokémon TCG price guessing game: estimate the Cardmarket value of a real card and score on how close you land.', '/guess-the-price')],
	title: 'Guess the Price - Pokémon Card Price Game',
};

/** Below this the guess is a coin flip between 0 and 2, so cheap bulk never gets drawn. */
const MIN_PRICE = 3;

/** Rounds handed over per load. Re-running this load re-reads every card and price, so one batch buys ~20 instant turns. */
const BATCH_SIZE = 20;

/** Cardmarket's `simple` value is the one the card page shows, so the game asks for that and falls back to the trend. */
function gamePrice(price: PriceData | undefined): number | null {
	return price?.simple ?? price?.trend ?? null;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const allCards: Card[] = (await parentData.streamed.allCards) || [];
	const prices: Record<string, PriceData> = (await parentData.streamed.prices) || {};
	const sets: Set[] = parentData.sets || [];

	// The whole game is guessing from the picture, so a card TCGdex has no art for is unplayable.
	const playable: { card: Card; price: number }[] = [];
	for (const card of allCards) {
		if (!card.image) continue;
		const price = gamePrice(prices[card.cardCode]);
		if (price === null || price < MIN_PRICE) continue;
		playable.push({ card, price });
	}

	if (!playable.length) {
		return { ...SEO, rounds: [], error: `No card with artwork and a price of ${MIN_PRICE} EUR or more.` };
	}

	const releaseDates = new Map(sets.map(set => [set.name, set.releaseDate]));
	const picked = new Set<number>();
	while (picked.size < Math.min(BATCH_SIZE, playable.length)) {
		picked.add(Math.floor(Math.random() * playable.length));
	}

	const rounds: Round[] = [...picked].map(index => {
		const { card, price } = playable[index];
		return { card, price, releaseDate: releaseDates.get(card.setName) ?? null };
	});

	return { ...SEO, rounds, error: null };
};
