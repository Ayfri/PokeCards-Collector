import { BASE_URL, SITE_NAME, SITE_TWITTER } from '~/constants';
import { processCardImage } from '$helpers/card-images';
import type { Breadcrumb, Card, Pokemon, PriceData, Set, UserProfile } from '$lib/types';

/** Schema.org nodes are free-form JSON, so every builder returns the same opaque shape the `Seo` component inlines. */
export type Schema = Record<string, unknown>;

export const HOME_CRUMB: Breadcrumb = { name: 'Home', url: '/' };

/** Prepends the home crumb so a page only declares the trail below the root. */
export function breadcrumbs(...trail: Breadcrumb[]): Breadcrumb[] {
	return [HOME_CRUMB, ...trail];
}

/** `a`/`an` for a rarity or a type name, so a generated description does not read "a Uncommon card". */
export function article(word: string): string {
	return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** The lowest sensible cardmarket value for a card, in EUR, or `null` when no price row carries one. */
export function cardPrice(price: PriceData | undefined): number | null {
	const value = price?.simple ?? price?.trend ?? price?.avg30 ?? price?.low ?? null;
	return value && value > 0 ? value : null;
}

/**
 * A card as a `Product` with an `Offer`: this is what makes a card page eligible for the price and availability
 * treatment in search results, and it is the only place the cardmarket value is exposed to a crawler.
 */
export function cardSchema(card: Card, price: PriceData | undefined, pokemon?: Pokemon, set?: Set, route: '/card' | '/jp-card' = '/card'): Schema {
	const value = cardPrice(price);
	const url = `${BASE_URL}${route}/${card.cardCode}`;

	return {
		'@id': `${url}#product`,
		'@type': 'Product',
		additionalProperty: [
			property('Set', card.setName),
			property('Rarity', card.rarity),
			property('Artist', card.artist),
			property('Card number', card.localId),
			property('Type', card.types),
			property('HP', card.hp),
			property('Stage', card.stage),
			property('Regulation mark', card.regulationMark),
		].filter(Boolean),
		brand: { '@type': 'Brand', name: 'The Pokémon Company' },
		category: `Trading Cards > Pokémon TCG${set?.series ? ` > ${set.series}` : ''}`,
		description: pokemon?.description
			? `${card.name}, ${article(card.rarity)} ${card.rarity} Pokémon card from ${card.setName}. ${pokemon.description}`
			: `${card.name}, ${article(card.rarity)} ${card.rarity} card from the ${card.setName} Pokémon TCG set, illustrated by ${card.artist}.`,
		image: processCardImage(card.image),
		isPartOf: set ? { '@id': `${BASE_URL}/sets#${slug(set.name)}` } : undefined,
		name: card.name,
		...(card.artist && { creator: { '@type': 'Person', name: card.artist } }),
		...(value && {
			offers: {
				'@type': 'Offer',
				availability: 'https://schema.org/InStock',
				price: value.toFixed(2),
				priceCurrency: 'EUR',
				// Cardmarket restates its averages daily, so a longer validity would advertise a stale price.
				priceValidUntil: tomorrow(),
				seller: { '@type': 'Organization', name: 'Cardmarket' },
				url: card.cardMarketUrl || url,
			},
		}),
		url,
	};
}

/** A card grid as an `ItemList`, which is how a crawler learns the page is a list and what the first entries are. */
export function cardListSchema(cards: Card[], listUrl: string, name: string, limit = 25): Schema {
	return {
		'@type': 'ItemList',
		itemListElement: cards.slice(0, limit).map((card, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			url: `${BASE_URL}/card/${card.cardCode}`,
			name: card.name,
			image: processCardImage(card.image),
		})),
		itemListOrder: 'https://schema.org/ItemListOrderAscending',
		name,
		numberOfItems: cards.length,
		url: `${BASE_URL}${listUrl}`,
	};
}

/** A set as a `CreativeWorkSeries` node carrying its release date and card count. */
export function setSchema(set: Set, route: '/cards-list' | '/japan' = '/cards-list'): Schema {
	return {
		'@id': `${BASE_URL}/sets#${slug(set.name)}${route === '/japan' ? '-jp' : ''}`,
		'@type': 'CreativeWorkSeries',
		datePublished: isoDate(set.releaseDate),
		image: set.logo || undefined,
		name: set.name,
		numberOfItems: set.totalCards ?? set.printedTotal,
		url: `${BASE_URL}${route}?set=${encodeURIComponent(set.name)}`,
	};
}

/** The set list as an `ItemList` of `CreativeWorkSeries`, so each set is an entity rather than a row of text. */
export function setListSchema(sets: Set[], limit = 50): Schema {
	return {
		'@type': 'ItemList',
		itemListElement: sets.slice(0, limit).map((set, index) => ({
			'@type': 'ListItem',
			item: setSchema(set),
			position: index + 1,
		})),
		name: 'Pokémon TCG sets',
		numberOfItems: sets.length,
		url: `${BASE_URL}/sets`,
	};
}

/** A collector's public page as a `ProfilePage` with its owner, which is the shape Google reads for profile results. */
export function profileSchema(profile: UserProfile, path: string, stats?: { cards: number; uniqueCards: number }): Schema {
	return {
		'@type': 'ProfilePage',
		dateCreated: profile.created_at,
		dateModified: profile.updated_at,
		mainEntity: {
			'@type': 'Person',
			identifier: profile.username,
			name: profile.username,
			url: `${BASE_URL}/profile/${profile.username}`,
			...(stats && {
				interactionStatistic: {
					'@type': 'InteractionCounter',
					interactionType: 'https://schema.org/CollectAction',
					userInteractionCount: stats.cards,
				},
			}),
		},
		url: `${BASE_URL}${path}`,
	};
}

/** The two daily games are real games, and `Game` is what tells an AI answer engine they can be played here. */
export function gameSchema(name: string, description: string, path: string): Schema {
	return {
		'@type': 'Game',
		applicationCategory: 'GameApplication',
		description,
		gamePlatform: 'Web browser',
		genre: 'Puzzle',
		isAccessibleForFree: true,
		name,
		numberOfPlayers: { '@type': 'QuantitativeValue', value: 1 },
		publisher: { '@id': `${BASE_URL}/#website`, name: SITE_NAME },
		url: `${BASE_URL}${path}`,
	};
}

/**
 * A `FAQPage` node. Answer engines quote these near-verbatim, so each answer has to stand alone without the page
 * around it. Only ever declare questions the page itself answers.
 */
export function faqSchema(entries: { answer: string; question: string }[]): Schema {
	return {
		'@type': 'FAQPage',
		mainEntity: entries.map(entry => ({
			'@type': 'Question',
			acceptedAnswer: { '@type': 'Answer', text: entry.answer },
			name: entry.question,
		})),
	};
}

/** The site owner, referenced by the `WebSite` node so the brand resolves to one entity across every page. */
export function organizationSchema(): Schema {
	return {
		'@id': `${BASE_URL}/#organization`,
		'@type': 'Organization',
		description: 'A free Pokémon TCG catalogue and collection tracker covering every English and Japanese set.',
		founder: { '@type': 'Person', name: 'Pierre Roy', url: 'https://ayfri.com' },
		logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png`, width: 485, height: 436 },
		name: SITE_NAME,
		sameAs: ['https://github.com/Ayfri/PokeCards-Collector', 'https://ayfri.com', `https://x.com/${SITE_TWITTER.slice(1)}`],
		url: BASE_URL,
	};
}

function property(name: string, value: string | number | undefined | null) {
	if (value === undefined || value === null || value === '') return null;
	return { '@type': 'PropertyValue', name, value: String(value) };
}

function slug(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isoDate(value: Date | string | undefined): string | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function tomorrow(): string {
	return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}
