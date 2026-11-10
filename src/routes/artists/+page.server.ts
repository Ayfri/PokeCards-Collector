import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import type { Set as CardSet, FullCard, PlateCard, PlateSet, PriceData } from '#lib/types.js';
import { breadcrumbs } from '#helpers/seo.ts';
import { cardPrice, memoizedOn } from '#helpers/card-utils.ts';

/**
 * Candidates sent per artist: the preview stack draws three, and the spare replaces a scan that fails to load in the browser.
 * One spare is enough because a scan only fails when TCGdex lists it before the upload, and the top cards of an artist are the old, uploaded ones.
 */
const SHOWCASE_CANDIDATES = 4;

/** The card fields the preview stack renders and nothing more, because 411 artists send ~1600 of these cards. */
interface ShowcaseCard {
	cardCode: string;
	image: string;
	name: string;
	/** Only on a card with no scan: the fields its plate draws in place of the scan, with the set it belongs to. */
	plate?: { card: PlateCard; set?: PlateSet };
	types: string;
}

const PLATE_FIELDS = ['artImage', 'artSource', 'artist', 'cardCode', 'hp', 'language', 'localId', 'name', 'pokemonNumber', 'rarity', 'setId', 'setName', 'stage', 'subtype', 'supertype', 'types'] as const satisfies readonly (keyof PlateCard)[];

/** Copies the plate fields that are set: an absent column stays off the object instead of travelling as `void 0` in every document. */
const plateOf = (card: FullCard, set: CardSet | undefined): NonNullable<ShowcaseCard['plate']> => ({
	card: Object.fromEntries(PLATE_FIELDS.filter(field => card[field] !== undefined).map(field => [field, card[field]])) as PlateCard,
	...(set && { set: { name: set.name, printedTotal: set.printedTotal, ...(set.symbol && { symbol: set.symbol }) } }),
});

export interface ArtistWithCards {
	/** `totalValue` spread over the artist's cards, in EUR. */
	averageValue: number;
	firstReleaseYear: number;
	lastReleaseYear: number;
	name: string;
	/** Cards with art first, then by price. An artist with no art at all gets cards with an empty `image`, drawn as plates. */
	showcaseCards: ShowcaseCard[];
	totalCards: number;
	/** Cardmarket value of every card the artist drew, in EUR. */
	totalValue: number;
}

/** Keyed on the memoized tables: the regrouping of every card runs once per refreshed table instead of once per request. */
const aggregates = new WeakMap<object, unknown>();

/** Aggregated on the server: rebuilding these 411 rows in the browser needs all 23546 cards and 19819 prices, a ~26 MB document. */
const aggregateArtists = (allCards: FullCard[], prices: Record<string, PriceData>, sets: CardSet[]) => memoizedOn(aggregates, [allCards, prices, sets], (): ArtistWithCards[] => {
	const setsById = new Map(sets.map(set => [set.setId, set]));
	const byArtist = new Map<string, FullCard[]>();

	for (const card of allCards) {
		if (!card.artist) continue;
		const cards = byArtist.get(card.artist);
		if (cards) cards.push(card);
		else byArtist.set(card.artist, [card]);
	}

	return [...byArtist.entries()]
		.map(([name, artistCards]) => {
			let totalValue = 0;
			let firstReleaseYear = Number.POSITIVE_INFINITY;
			let lastReleaseYear = Number.NEGATIVE_INFINITY;
			const showcase: { card: FullCard; price: number }[] = [];

			/** One pass instead of a full sort per artist: the total, the years and the showcase candidates are computed together. */
			for (const card of artistCards) {
				const price = cardPrice(prices[card.cardCode]) ?? 0;
				totalValue += price;

				const year = setsById.get(card.setId)?.releaseDate.getFullYear();
				if (year && !Number.isNaN(year)) {
					if (year < firstReleaseYear) firstReleaseYear = year;
					if (year > lastReleaseYear) lastReleaseYear = year;
				}

				const hasArt = Boolean(card.image);
				const slot = showcase.findIndex(entry => hasArt !== Boolean(entry.card.image) ? hasArt : price > entry.price);
				if (slot !== -1) showcase.splice(slot, 0, { card, price });
				else if (showcase.length < SHOWCASE_CANDIDATES) showcase.push({ card, price });
				if (showcase.length > SHOWCASE_CANDIDATES) showcase.pop();
			}

			return {
				averageValue: artistCards.length ? totalValue / artistCards.length : 0,
				firstReleaseYear: Number.isFinite(firstReleaseYear) ? firstReleaseYear : 0,
				lastReleaseYear: Number.isFinite(lastReleaseYear) ? lastReleaseYear : 0,
				name,
				showcaseCards: showcase.map(({ card }) => ({
					cardCode: card.cardCode,
					image: card.image,
					name: card.name,
					...(!card.image && { plate: plateOf(card, setsById.get(card.setId)) }),
					types: card.types,
				})),
				totalCards: artistCards.length,
				totalValue,
			};
		})
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
});

export const load: PageServerLoad = async () => {
	const [allCards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);
	const artists = aggregateArtists(allCards, prices, sets);

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Artists', url: '/artists' }),
		description: `The ${artists.length} illustrators behind the Pokémon Trading Card Game. Open an artist to see every card they have drawn, with prices and set information.`,
		image: ogImage({ kind: 'page', name: 'artists' }, 'Every Pokémon TCG illustrator on PokéCards-Collector, with the artist count and the most valuable cards'),
		keywords: ['Pokémon card artists', 'Pokémon TCG illustrators', 'Pokémon card artwork'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: artists.slice(0, 50).map((artist, index) => ({
				'@type': 'ListItem',
				item: { '@type': 'Person', jobTitle: 'Illustrator', name: artist.name },
				position: index + 1,
			})),
			name: 'Pokémon TCG illustrators',
			numberOfItems: artists.length,
		}],
		title: 'Pokémon TCG Card Artists',
		type: 'CollectionPage' as const,
	};

	return {
		artists,
		...pageSeoData
	};
};
