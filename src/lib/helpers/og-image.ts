import { cardPrice } from '#helpers/card-utils.ts';
import type { Catalogue, Language } from '#helpers/catalogues.ts';
import type { Card, Image, PriceData, Set } from '#lib/types.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Bumped whenever a layout in `og-render.ts` changes, so every cached share preview refreshes with the next deploy. */
const OG_REVISION = 1;

/** The pages with an image of their own that only depends on the catalogue, keyed by the name `/og/page/<name>.png` takes. */
export const OG_PAGES = ['artists', 'binder', 'card.dle', 'cards-list', 'france', 'guess-the-price', 'home', 'japan', 'pokemons', 'sets', 'trainers', 'users'] as const;
export type OgPage = (typeof OG_PAGES)[number];

export type OgUserKind = 'collection' | 'profile' | 'wishlist';

export type OgTarget =
	| { kind: 'card'; code: string; language: Language }
	| { kind: 'page'; name: OgPage }
	| { kind: 'set'; language: Language; setId: string }
	| { kind: OgUserKind; username: string };

/** FNV-1a, base 36: a cache key needs to change with its input, not to resist collisions on purpose. */
function shortHash(input: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 0x01000193);
	return (hash >>> 0).toString(36);
}

function ogPath(target: OgTarget): string {
	switch (target.kind) {
		case 'card': return `card/${target.language}/${encodeURIComponent(target.code)}`;
		case 'page': return `page/${target.name}`;
		case 'set': return `set/${target.language}/${encodeURIComponent(target.setId)}`;
		default: return `${target.kind}/${encodeURIComponent(target.username)}`;
	}
}

type OgVersion = (number | string | null | undefined)[];

/** The `?v=` of a share image from the facts it draws, so the URL changes with the data. */
export const ogVersion = (...version: OgVersion): string => shortHash([OG_REVISION, ...version].join('|'));

/** What a card image draws: its name, scan and price. The page loads and `/og/[...path]` both take their version from here. */
export const cardOgVersion = (card: Pick<Card, 'image' | 'name'>, price: number | null): OgVersion => [card.name, card.image, price];

/** What a set image draws: the card count and the set value to the cent. */
export const setOgVersion = (set: Pick<Set, 'totalCards'>, value: number): OgVersion => [set.totalCards, Math.round(value * 100)];

export const setValue = (setId: string, cards: Card[], prices: Record<string, PriceData>): number =>
	cards.reduce((sum, card) => card.setId === setId ? sum + (cardPrice(prices[card.cardCode]) ?? 0) : sum, 0);

/**
 * The share image of a page, rendered by `/og/[...path]`. `version` lists what the image draws (a price, a card count),
 * so the `?v=` key changes with the data and Discord, X or Slack fetch a fresh preview instead of their cached one.
 * The route recomputes the version of a card, set or catalogue page from the database and redirects any other `v` to it, so a forged URL
 * neither renders nor fills the cache. A user image ignores `v`: its version needs the owner's rows, so it is only a cache buster there.
 */
export function ogImage(target: OgTarget, alt: string, ...version: OgVersion): Image {
	return {
		alt,
		height: OG_HEIGHT,
		url: `/og/${ogPath(target)}.png?v=${ogVersion(...version)}`,
		width: OG_WIDTH,
	};
}

/** A set grid's share image, versioned on the card count and the set value `value` it prints. */
export function setShareImage(set: Set, value: number, catalogue: Catalogue): Image {
	return ogImage(
		{ kind: 'set', language: catalogue.language, setId: set.setId },
		`${set.name}, ${catalogue.adjective} Pokémon TCG set: its logo, card count, total value and most valuable cards`,
		...setOgVersion(set, value),
	);
}
