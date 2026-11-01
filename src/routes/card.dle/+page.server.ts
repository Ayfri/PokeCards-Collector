import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { utcDay } from '#helpers/card-dle.ts';
import { breadcrumbs, gameSchema } from '#helpers/seo.ts';

/**
 * SEO and the server's UTC day (`today`), which the stored board follows instead of the client clock. The guessable cards come from
 * `/api/card-dle/suggestions` through `+page.ts`: returning them here would serialize 5700 whole cards, the 21066-card catalogue and
 * the 19819-entry price table into the document.
 */
export const load: PageServerLoad = () => ({
	image: ogImage({ kind: 'page', name: 'card.dle' }, 'Card.dle, the daily Pokémon card guessing game, with rows of hint tiles turning from red to green'),
	title: 'Card.dle - Daily Pokémon Card Guessing Game',
	description: 'Guess the mystery Pokémon card of the day. Every guess compares the Pokémon, artist, set, rarity, supertype, type and price with the mystery card. One card a day, the same for everyone, free and without an account.',
	breadcrumbs: breadcrumbs({ name: 'Card.dle', url: '/card.dle' }),
	keywords: ['Pokémon wordle', 'card.dle', 'daily Pokémon card game', 'guess the Pokémon card'],
	schemas: [gameSchema('Card.dle', "A daily Pokémon TCG guessing game: find the mystery card of the day from Pokémon, artist, set, rarity, supertype, type and price hints.", '/card.dle')],
	today: utcDay(),
});
