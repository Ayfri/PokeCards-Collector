import { getCards, getPrices } from '#helpers/supabase-data.ts';
import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { breadcrumbs, gameSchema } from '#helpers/seo.ts';
import type { Card, Set } from '#lib/types.js';
import { cardPrice } from '#helpers/card-utils.ts';

/** One playable card: the art to show, the price to guess and the set date shown as a hint. */
export interface Round {
	card: Card;
	price: number;
	releaseDate: Date | null;
}

/** Shared by both returns of the load, so a page with no playable card still has a full head. */
const SEO = {
	breadcrumbs: breadcrumbs({ name: 'Guess the Price', url: '/guess-the-price' }),
	description: 'Guess what a Pokémon card is worth on Cardmarket. Real cards, real euro prices, a new set of rounds every time. Free and playable without an account.',
	keywords: ['guess the price', 'Pokémon card price game', 'Pokémon TCG game', 'card value quiz'],
	schemas: [gameSchema('Guess the Price', 'A Pokémon TCG price guessing game: estimate the Cardmarket value of a real card and score on how close you land.', '/guess-the-price')],
	image: ogImage({ kind: 'page', name: 'guess-the-price' }, 'Guess the Price, the Pokémon card price game: a valuable card with its price hidden under a ??? € tag'),
	title: 'Guess the Price - Pokémon Card Price Game',
};

/** Below this price a guess is a coin flip between 0 and 2, so cheap bulk cards are never drawn. */
const MIN_PRICE = 3;

/** Rounds returned per load. Re-running the load re-reads every card and price, so one batch gives ~20 turns with no wait. */
const BATCH_SIZE = 20;

export const load: PageServerLoad = async ({ parent }) => {
	const catalogue = Promise.all([getCards(), getPrices()]);
	const sets: Set[] = (await parent()).sets || [];
	const [allCards, prices] = await catalogue;

	/** The game is guessing from the picture, so a card TCGdex has no art for cannot be played. */
	const playable: { card: Card; price: number }[] = [];
	for (const card of allCards) {
		if (!card.image) continue;
		const price = cardPrice(prices[card.cardCode]);
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
