import { redirect } from '@sveltejs/kit';
import { distinctArtists, distinctRarities } from '#helpers/card-grid.ts';
import { breadcrumbs, profileSchema } from '#helpers/seo.ts';
import { ogImage } from '#helpers/og-image.ts';
import { readOwnedCatalogues } from '#helpers/owned-cards.ts';
import { getCatalogue, getPokemons, getTypes } from '#helpers/supabase-data.ts';
import { getProfileByUsername } from '#lib/services/profiles.ts';
import { cardPrice, type CardLink } from '#helpers/card-utils.ts';
import type { Language } from '#helpers/catalogues.ts';
import { computeCollectionStats } from '#helpers/collection-stats.ts';
import { formatEuros } from '#helpers/format.ts';
import type { FullCard, GridPokemon, PublicProfile, Set, UserProfile } from '#lib/types.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Everything the grid draws for one user's cards. Streamed, so the profile lookup answers before the catalogue is read. */
interface UserCardsPayload {
	artists: string[];
	cards: FullCard[];
	pokemons: GridPokemon[];
	rarities: string[];
	/** The Japanese and French sets of the owned cards, to add to the English ones the layout carries. */
	sets: Set[];
	types: string[];
}

type CardItem = { card_code: string };

/** The numbers and top cards the server draws into the HTML, since the grid itself streams in after the first byte. */
export interface UserCardsSummary {
	/** Duplicates included, equal to `uniqueCards` on a wishlist. */
	copies: number;
	/** The few most valuable owned cards, carrying what `cardPath` needs and the `cardCode` that keys them, since two cards can share a slug. */
	topCards: (CardLink & { cardCode: string; language: Language; price: number })[];
	totalValue: number;
	uniqueCards: number;
}

/** How many top cards the HTML names: the document stays small and the line stays on one row. */
const SUMMARY_TOP_CARDS = 5;

const cardCount = (count: number) => `${count.toLocaleString('en-US')} unique Pokémon TCG card${count === 1 ? '' : 's'}`;

interface UserCardsCopy {
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

export const USER_CARDS_COPY = {
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
} satisfies Record<'collection' | 'wishlist', UserCardsCopy>;

export type UserCardsKind = keyof typeof USER_CARDS_COPY;

async function buildPayload(itemCodes: string[]): Promise<{ payload: UserCardsPayload; summary: UserCardsSummary | null }> {
	/** A missing, private or empty page draws no grid, so it skips the four catalogue reads. */
	if (itemCodes.length === 0) return { payload: { artists: [], cards: [], pokemons: [], rarities: [], sets: [], types: [] }, summary: null };

	const [catalogues, pokemons, types] = await Promise.all([readOwnedCatalogues(itemCodes, getCatalogue), getPokemons(), getTypes()]);

	/** Each card carries the catalogue that resolved it, so its tile links to the right card page, and its price from that catalogue. */
	const userCards = catalogues.flatMap(({ language, owned, prices }) => owned.map(card => ({ ...card, language, price: cardPrice(prices[card.cardCode]) })));
	const dexIds = new Set(userCards.map(card => card.pokemonNumber));

	/** A wishlist goes in as the collection argument, so every copy count stays 1 and `wishlist_*` are not read. */
	const stats = computeCollectionStats(itemCodes.map(card_code => ({ card_code })), [], catalogues);

	return {
		payload: {
			/** The filter lists come from these cards, not the whole catalogue: a 200-card collection would otherwise offer 1700 artists. */
			artists: distinctArtists(userCards),
			cards: userCards,
			/** Only the Pokémon these cards name: the full table is 1025 rows with their Pokédex entries, just to look up a name. */
			pokemons: pokemons.filter(pokemon => dexIds.has(pokemon.id)).map(({ id, name }) => ({ id, name })),
			rarities: distinctRarities(userCards),
			/** The English sets already come with the layout, so only the sets of the other catalogues' owned cards travel. */
			sets: catalogues.filter(({ language }) => language !== 'en').flatMap(({ language, owned, sets }) => {
				const ownedSetIds = new Set(owned.map(card => card.setId));
				return sets.filter(set => ownedSetIds.has(set.setId)).map(set => ({ ...set, language }));
			}),
			types,
		},
		summary: {
			copies: stats.total_instances,
			topCards: stats.top_cards.slice(0, SUMMARY_TOP_CARDS).map(({ card, price }) => ({
				cardCode: card.cardCode,
				language: card.language ?? 'en',
				localId: card.localId,
				name: card.name,
				price,
				setId: card.setId,
				setName: card.setName,
			})),
			totalValue: stats.total_value,
			uniqueCards: stats.unique_cards,
		},
	};
}

/** The root layout's data this load reads: the viewer's profile and their own rows, so their own page costs no extra query. */
interface ViewerData {
	collectionItems: CardItem[];
	profile: UserProfile | null;
	wishlistItems: CardItem[];
}

interface UserCardsPageOptions {
	client: SupabaseClient;
	fetchItems: (username: string, client: SupabaseClient) => Promise<{ data: CardItem[] | null; error: unknown }>;
	kind: UserCardsKind;
	parent: () => Promise<ViewerData>;
	requestedUsername: string;
}

/**
 * Shared load for `/collection/[user]` and `/wishlist/[user]`: they differ only in the table they read and the words
 * they print. The card payload is streamed, and the catalogue is never touched for a page the visitor cannot see.
 */
export async function loadUserCardsPage({ client, fetchItems, kind, parent, requestedUsername }: UserCardsPageOptions) {
	const copy = USER_CARDS_COPY[kind];
	/** The profile lookup runs in parallel with the layout load instead of waiting for it. */
	const [{ data: targetProfile, error: profileError }, viewer] = await Promise.all([getProfileByUsername(requestedUsername, client), parent()]);

	if (profileError || !targetProfile) {
		return {
			breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }),
			description: `${copy.label} for user ${requestedUsername} could not be found or user does not exist.`,
			heading: 'User Not Found',
			isOwner: false,
			isPublic: false,
			noindex: true,
			schemas: [],
			streamed: { payload: buildPayload([]).then(({ payload }) => payload) },
			summary: null as UserCardsSummary | null,
			targetProfile: null as PublicProfile | null,
			targetUsername: requestedUsername,
			title: 'User Not Found',
			type: 'CollectionPage' as const,
		};
	}

	/** Usernames match case-insensitively, so the browser and the crawler are sent to the stored casing. */
	if (targetProfile.username !== requestedUsername) redirect(307, `/${kind}/${encodeURIComponent(targetProfile.username)}`);

	const username = targetProfile.username;
	const isOwner = viewer.profile?.username === username;
	const isPublic = targetProfile.is_public;
	const canRead = isPublic || isOwner;

	const items = canRead
		? isOwner
			? viewer[`${kind}Items`]
			: (await fetchItems(username, client)).data ?? []
		: [];

	const built = buildPayload(items.map(item => item.card_code));
	/** Awaited so the HTML names the numbers and the top cards, since a crawler that skips JavaScript never sees the streamed grid. A failed read leaves the summary out and the stream shows the error. */
	const summary = canRead && items.length ? await built.then(({ summary }) => summary, () => null) : null;

	return {
		breadcrumbs: breadcrumbs(
			{ name: 'Collectors', url: '/users' },
			{ name: username, url: `/profile/${username}` },
			{ name: copy.crumb, url: `/${kind}/${username}` }
		),
		description: canRead ? (isOwner ? copy.ownDescription : copy.publicDescription(username, summary)) : copy.privateDescription,
		/** `heading` is the short form shown on the page, `title` the long one the crawler indexes. */
		heading: canRead ? (isOwner ? copy.ownTitle : `${username}'s ${copy.label}`) : copy.privateHeading,
		/** Versioned on the owned codes and the rounded total value of a public list only, so a private one never feeds what the owner sees into its URL. */
		image: ogImage(
			{ kind, username },
			isPublic ? `${username}'s Pokémon card ${kind}: ${items.length} unique cards, their value and the most valuable ones` : `${username}'s private Pokémon card ${kind}`,
			...(isPublic ? [items.length, items.map(item => item.card_code).join(), Math.round((summary?.totalValue ?? 0) * 100)] : ['private']),
		),
		isOwner,
		isPublic,
		/** Only a public profile's cards are public content, anything else (an empty public list included) is a shell the crawler must not index. */
		noindex: !isPublic || !items.length,
		schemas: isPublic ? [profileSchema(targetProfile, `/${kind}/${username}`)] : [],
		streamed: { payload: built.then(({ payload }) => payload) },
		summary,
		targetProfile,
		targetUsername: username,
		title: canRead ? (isOwner ? copy.ownTitle : copy.publicTitle(username)) : copy.privateTitle,
		type: 'CollectionPage' as const,
	};
}

export type UserCardsPageData = Awaited<ReturnType<typeof loadUserCardsPage>>;
