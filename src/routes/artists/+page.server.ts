import { getCards, getPrices } from '$helpers/supabase-data';
import type { PageServerLoad } from './$types';
import type { FullCard } from '$lib/types';
import { breadcrumbs } from '$helpers/seo';
import { buildSetLookupMap, findSetInLookup } from '$helpers/set-utils';

/** Cards drawn on the preview stack of an artist card. */
const SHOWCASE_SIZE = 3;

/** The card fields the preview stack renders. A showcase card carries nothing else, 411 artists ship 1233 of them. */
interface ShowcaseCard {
	cardCode: string;
	image: string;
	name: string;
	types: string;
}

export interface ArtistWithCards {
	/** `totalValue` spread over the artist's cards, in EUR. */
	averageValue: number;
	firstReleaseYear: number;
	lastReleaseYear: number;
	name: string;
	showcaseCards: ShowcaseCard[];
	totalCards: number;
	/** Cardmarket value of every card the artist drew, in EUR. */
	totalValue: number;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
	const sets = parentData.sets || [];

	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	const setLookup = buildSetLookupMap(sets);
	const byArtist = new Map<string, FullCard[]>();

	for (const card of allCards) {
		if (!card.artist) continue;
		const cards = byArtist.get(card.artist);
		if (cards) cards.push(card);
		else byArtist.set(card.artist, [card]);
	}

	// Aggregated here rather than in the browser: the page used to ship all 23546 cards and 19819 prices so the
	// component could rebuild these 411 rows itself, which made the document ~26 MB.
	const artists: ArtistWithCards[] = [...byArtist.entries()]
		.map(([name, artistCards]) => {
			let totalValue = 0;
			let firstReleaseYear = Number.POSITIVE_INFINITY;
			let lastReleaseYear = Number.NEGATIVE_INFINITY;
			const showcase: { card: FullCard; price: number }[] = [];

			// One pass instead of a full sort per artist: the total, the years and the three priciest cards come out together.
			for (const card of artistCards) {
				const price = prices[card.cardCode]?.simple || prices[card.cardCode]?.trend || 0;
				totalValue += price;

				const year = findSetInLookup(card.cardCode, setLookup)?.releaseDate.getFullYear();
				if (year && !Number.isNaN(year)) {
					if (year < firstReleaseYear) firstReleaseYear = year;
					if (year > lastReleaseYear) lastReleaseYear = year;
				}

				if (!card.image) continue; // A card with no art cannot be shown in the preview stack.
				const slot = showcase.findIndex(entry => price > entry.price);
				if (slot !== -1) showcase.splice(slot, 0, { card, price });
				else if (showcase.length < SHOWCASE_SIZE) showcase.push({ card, price });
				if (showcase.length > SHOWCASE_SIZE) showcase.pop();
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
					types: card.types,
				})),
				totalCards: artistCards.length,
				totalValue,
			};
		})
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Artists', url: '/artists' }),
		description: `The ${artists.length} illustrators behind the Pokémon Trading Card Game. Open an artist to see every card they have drawn, with prices and set information.`,
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
		...layoutData,
		artists,
		...pageSeoData
	};
};
