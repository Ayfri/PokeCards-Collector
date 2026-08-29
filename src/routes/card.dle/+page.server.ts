import type { PageServerLoad } from './$types';
import { breadcrumbs, gameSchema } from '$helpers/seo';

/**
 * SEO only. The guessable cards come from `/api/card-dle/suggestions` through `+page.ts`: returning them here
 * serialized 5700 whole cards, the 21066-card catalogue and the 19819-entry price table into the document.
 */
export const load: PageServerLoad = async ({ parent }) => ({
	...(await parent()),
	title: 'Card.dle - Daily Pokémon Card Guessing Game',
	description: 'Guess the mystery Pokémon card of the day. Every guess reveals how close you are on set, rarity, type, artist and price. One card a day, the same for everyone, free and without an account.',
	breadcrumbs: breadcrumbs({ name: 'Card.dle', url: '/card.dle' }),
	keywords: ['Pokémon wordle', 'card.dle', 'daily Pokémon card game', 'guess the Pokémon card'],
	schemas: [gameSchema('Card.dle', "A daily Pokémon TCG guessing game: find the mystery card of the day from set, rarity, type, artist and price hints.", '/card.dle')],
});
