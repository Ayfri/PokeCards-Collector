import type { CardLink } from '#helpers/card-utils.ts';
import type { Language } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import type { OwnedCard, OwnedCards } from '#helpers/catalogue-data.ts';
import type { CollectionStats, Set } from '#lib/types.js';

/** Number of owned cards the profile showcases, most valuable first. */
const SHOWCASE_SIZE = 6;

/** The numbers and top cards the server draws into the HTML, since the grid itself streams in after the first byte. */
export interface UserCardsSummary {
	/** Duplicates included, equal to `uniqueCards` on a wishlist. */
	copies: number;
	/** The few most valuable owned cards, carrying what `cardPath` needs and the `cardCode` that keys them, since two cards can share a slug. */
	topCards: (CardLink & { cardCode: string; language: Language; price: number })[];
	totalValue: number;
	uniqueCards: number;
}

const cardCount = (count: number) => `${count.toLocaleString('en-US')} unique Pokémon TCG card${count === 1 ? '' : 's'}`;

interface UserCardsWording {
	crumb: string;
	emptyHint: string;
	emptyOther: (username: string) => string;
	emptyOwn: string;
	label: string;
	ownDescription: string;
	ownTitle: string;
	privateDescription: string;
	privateHeading: string;
	privateTitle: string;
	/** `summary` is null for an empty list, which is not indexed anyway. */
	publicDescription: (username: string, summary: UserCardsSummary | null) => string;
	publicTitle: (username: string) => string;
}

/**
 * Lives here and not in `user-cards-page.ts` because `UserCardsView` reads it in the browser: a value import of that module puts
 * `catalogue-data.ts` and its `cloudflare:workers` import in the client chunk, which no browser can load, so the page hydrates into an error 500.
 */
export const USER_CARDS_WORDING = {
	collection: {
		crumb: 'Collection',
		emptyHint: 'Add cards to your collection by browsing card pages.',
		emptyOther: username => `"${username}" collection is empty.`,
		emptyOwn: 'Your collection is empty.',
		label: 'Collection',
		ownDescription: 'Your Pokémon TCG card collection.',
		ownTitle: 'My Collection',
		privateDescription: `This user's collection is private.`,
		privateHeading: 'Collection is Private',
		privateTitle: 'Private Collection',
		publicDescription: (username, summary) => summary
			? `${username} owns ${cardCount(summary.uniqueCards)} worth about ${formatEuros(summary.totalValue)}, with Cardmarket prices in euros, set completion and filtering by set, rarity and type.`
			: `Every Pokémon TCG card ${username} owns, with Cardmarket prices in euros, set completion and filtering by set, rarity and type.`,
		publicTitle: username => `${username}'s Pokémon Card Collection`,
	},
	wishlist: {
		crumb: 'Wishlist',
		emptyHint: 'Add cards to your wishlist by browsing card pages.',
		emptyOther: username => `"${username}" wishlist is empty.`,
		emptyOwn: 'Your wishlist is empty.',
		label: 'Wishlist',
		ownDescription: 'Your Pokémon TCG card wishlist.',
		ownTitle: 'My Wishlist',
		privateDescription: `This user's wishlist is private.`,
		privateHeading: 'Wishlist is Private',
		privateTitle: 'Private Wishlist',
		publicDescription: (username, summary) => summary
			? `${username} is still hunting for ${cardCount(summary.uniqueCards)} worth about ${formatEuros(summary.totalValue)}, with Cardmarket prices in euros and the set each card belongs to.`
			: `The Pokémon TCG cards ${username} is still hunting for, with Cardmarket prices in euros and the set each card belongs to.`,
		publicTitle: username => `${username}'s Pokémon Card Wishlist`,
	},
} satisfies Record<'collection' | 'wishlist', UserCardsWording>;

export type UserCardsKind = keyof typeof USER_CARDS_WORDING;

const roundCents = (value: number) => Math.round(value * 100) / 100;

/** A French code always has a `fr`-prefixed set part (`pokemon_6_frsv03_125`) and no English or Japanese code does, so the code alone says which table holds it. */
export const isFrenchCode = (code: string) => /^[^_]+_\d+_fr/.test(code);

/** The numbers every user page draws: copies and value count duplicates, `uniqueCards` the distinct codes, orphan rows included. */
export function ownedTotals({ cards, codes, rows }: OwnedCards): { copies: number; top: (OwnedCard & { price: number })[]; totalValue: number; uniqueCards: number } {
	return {
		copies: rows,
		top: cards.filter((card): card is OwnedCard & { price: number } => (card.price ?? 0) > 0).sort((a, b) => b.price - a.price).slice(0, SHOWCASE_SIZE),
		totalValue: roundCents(cards.reduce((sum, { copies, price }) => sum + (price ?? 0) * copies, 0)),
		uniqueCards: codes,
	};
}

/**
 * Collection figures for a profile: copies and values count duplicates, rarities and set completion count distinct cards.
 * `sets` holds the set list of each language the collection touches: set ids repeat across languages (`base1` exists in English and in French),
 * and two Japanese sets can share a name, so a checklist is keyed on language plus set id. A set missing from `sets` has no checklist.
 */
export function collectionStats(collection: OwnedCards, wishlist: OwnedCards, sets: Partial<Record<Language, Set[]>>): CollectionStats {
	const { copies, top, totalValue, uniqueCards } = ownedTotals(collection);
	const cardsByRarity: Record<string, number> = {};
	const ownedBySet = new Map<string, { collectedValue: number; count: number }>();

	for (const { language, price, rarity, setId } of collection.cards) {
		cardsByRarity[rarity] = (cardsByRarity[rarity] ?? 0) + 1;
		const key = `${language}:${setId}`;
		const completion = ownedBySet.get(key) ?? { collectedValue: 0, count: 0 };
		completion.count++;
		completion.collectedValue += price ?? 0;
		ownedBySet.set(key, completion);
	}

	const setCompletion: CollectionStats['set_completion'] = {};
	for (const { cards: total, language, set_id, value } of collection.sets) {
		const key = `${language}:${set_id}`;
		const completion = ownedBySet.get(key);
		const set = sets[language]?.find(({ setId }) => setId === set_id);
		if (!completion || !set) continue;
		setCompletion[key] = {
			collectedValue: roundCents(completion.collectedValue),
			count: completion.count,
			language,
			name: set.name,
			percentage: (completion.count / total) * 100,
			set,
			total,
			totalValue: roundCents(value),
		};
	}

	return {
		cards_by_rarity: cardsByRarity,
		set_completion: setCompletion,
		top_cards: top.map(({ copies, price, ...card }) => ({ card, copies, price })),
		total_instances: copies,
		total_value: totalValue,
		unique_cards: uniqueCards,
		wishlist_count: wishlist.rows,
		wishlist_total_value: ownedTotals(wishlist).totalValue,
	};
}
