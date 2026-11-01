import { BASE_URL, SITE_NAME, SITE_TWITTER } from '#src/constants.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { CATALOGUES, type Catalogue } from '#helpers/catalogues.ts';
import { cardPath, cardPrice, setPath } from '#helpers/card-utils.ts';
import type { Breadcrumb, Card, Pokemon, PriceData, PublicProfile, Set } from '#lib/types.js';

/** Schema.org nodes are free-form JSON, so every builder returns the same opaque shape the `Seo` component inlines. */
export type Schema = Record<string, unknown>;

const HOME_CRUMB: Breadcrumb = { name: 'Home', url: '/' };

/** JSON safe to inline in a `<script>`: a `</script>` inside a username or card name would otherwise close the tag. */
export const inlineJson = (value: unknown): string => JSON.stringify(value).replaceAll('<', `${String.fromCharCode(92)}u003c`);

/** Prepends the home crumb so a page only declares the trail below the root. */
export function breadcrumbs(...trail: Breadcrumb[]): Breadcrumb[] {
	return [HOME_CRUMB, ...trail];
}

/** `a`/`an` for a rarity or a type name, so a generated description does not read "a Uncommon card". */
export function article(word: string): string {
	return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * A card as a `Product` with an `AggregateOffer`: this is what makes a card page eligible for a Product snippet with a price range, and it is
 * the only place the Cardmarket value is exposed to a crawler. Google reserves a plain `Offer` for merchant listings, which need a page
 * that sells the item, so an aggregator of Cardmarket prices declares the range it reports, from the lowest listing to the market value.
 */
export function cardSchema(card: Card, price: PriceData | undefined, pokemon?: Pokemon, set?: Set, catalogue: Catalogue = CATALOGUES.en): Schema {
	const value = cardPrice(price);
	const low = price?.low && price.low > 0 ? Math.min(price.low, value ?? price.low) : value;
	const url = `${BASE_URL}${cardPath(catalogue.language, card)}`;

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
		isPartOf: set ? { '@id': setNodeId(set, catalogue) } : undefined,
		name: card.name,
		...(card.artist && { creator: { '@type': 'Person', name: card.artist } }),
		...(value && low && {
			offers: {
				'@type': 'AggregateOffer',
				highPrice: value.toFixed(2),
				lowPrice: low.toFixed(2),
				priceCurrency: 'EUR',
				seller: { '@type': 'Organization', name: 'Cardmarket' },
				url: card.cardMarketUrl || url,
			},
		}),
		sku: card.tcgdexId ?? card.cardCode,
		url,
	};
}

/** A card grid as an `ItemList`, which is how a crawler learns the page is a list and what the first entries are. */
export function cardListSchema(cards: Card[], listUrl: string, name: string, limit = 25, catalogue: Catalogue = CATALOGUES.en): Schema {
	return {
		'@type': 'ItemList',
		itemListElement: cards.slice(0, limit).map((card, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			url: `${BASE_URL}${cardPath(catalogue.language, card)}`,
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
export function setSchema(set: Set, catalogue: Catalogue = CATALOGUES.en): Schema {
	return {
		'@id': setNodeId(set, catalogue),
		'@type': 'CreativeWorkSeries',
		datePublished: isoDate(set.releaseDate),
		image: set.logo || undefined,
		name: set.name,
		numberOfItems: set.totalCards ?? set.printedTotal,
		url: `${BASE_URL}${setPath(set, catalogue)}`,
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
export function profileSchema(profile: PublicProfile, path: string, stats?: { cards: number; uniqueCards: number }): Schema {
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
		description: 'A free Pokémon TCG catalogue and collection tracker covering every English, Japanese and French set.',
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

/** The `@id` of a set node, shared by the set itself and the cards pointing at it; the set page URL is already unique per catalogue. */
function setNodeId(set: Set, catalogue: Catalogue): string {
	return `${BASE_URL}${setPath(set, catalogue)}#set`;
}

function isoDate(value: Date | string | undefined): string | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}
