import { cardPrice } from '#helpers/card-utils.ts';
import type { Catalogue, Language } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import type { Card, Image, PriceData, Set } from '#lib/types.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Bumped whenever a layout in `og-render.ts` changes: it is part of the cache key of every share image, so they all render again after the next deploy. */
export const OG_REVISION = 2;

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

/** The `?v=` of a share image from the facts it draws, so the URL changes with the data. The route ignores it: it only busts the caches of Discord, X and Google. */
const ogVersion = (...version: OgVersion): string => shortHash([OG_REVISION, ...version].join('|'));

/**
 * The price a card or set share image prints, at 2 significant digits (4.37 is 4.4, 5477.52 is 5500). The `?v=` hashes this printed value,
 * so a cent move changes neither the URL nor the PNG, and the preview is not fetched again for a price nobody can read the difference of.
 */
export const ogPrice = (value: number | null): number | null => value ? Number(value.toPrecision(2)) : null;

/** The `ogPrice` as the image prints it: a tilde, and decimals only below 10 where they are still significant. */
export const formatOgEuros = (value: number): string => `~${formatEuros(value, value < 1 ? 2 : value < 10 ? 1 : 0)}`;

/** What a card image draws: its name, scan and price, for the `?v=` of the card pages. */
export const cardOgVersion = (card: Pick<Card, 'image' | 'name'>, price: number | null): OgVersion => [card.name, card.image, ogPrice(price)];

/** What a set image draws: the card count and the set value. */
export const setOgVersion = (set: Pick<Set, 'totalCards'>, value: number): OgVersion => [set.totalCards, ogPrice(value)];

export const setValue = (setId: string, cards: Card[], prices: Record<string, PriceData>): number =>
	cards.reduce((sum, card) => card.setId === setId ? sum + (cardPrice(prices[card.cardCode]) ?? 0) : sum, 0);

/**
 * The share image of a page, rendered by `/og/[...path]`. `version` lists what the image draws (a price, a card count),
 * so the `?v=` changes with the data and Discord, X or Slack fetch a fresh preview instead of their cached one.
 * The route never checks `v` against the database and caches one image per path: a `v` other than the cached one renders again only when that
 * image is over an hour old, so a forged `v` costs at most one render per path, hour and colo.
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
