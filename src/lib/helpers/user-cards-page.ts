import { redirect } from '@sveltejs/kit';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import { parseCardCode } from '$helpers/card-utils';
import { breadcrumbs, profileSchema } from '$helpers/seo';
import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { getProfileByUsername } from '$lib/services/profiles';
import type { FullCard, Pokemon, PriceData, UserProfile } from '$lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Everything the grid draws for one user's cards. Streamed, so the profile lookup answers before the catalogue is read. */
export interface UserCardsPayload {
	artists: string[];
	cards: FullCard[];
	pokemons: Pokemon[];
	prices: Record<string, PriceData>;
	rarities: string[];
	types: string[];
}

type CardItem = { card_code: string };

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
	publicDescription: (username: string) => string;
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
		publicDescription: username => `Every Pokémon TCG card ${username} owns, with Cardmarket prices in euros, set completion and filtering by set, rarity and type.`,
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
		publicDescription: username => `The Pokémon TCG cards ${username} is still hunting for, with Cardmarket prices in euros and the set each card belongs to.`,
		publicTitle: username => `${username}'s Pokémon Card Wishlist`,
	},
} satisfies Record<'collection' | 'wishlist', UserCardsCopy>;

export type UserCardsKind = keyof typeof USER_CARDS_COPY;

async function buildPayload(itemCodes: string[]): Promise<UserCardsPayload> {
	// A missing, private or empty page draws no grid, so it never pays for the four catalogue reads.
	if (itemCodes.length === 0) return { artists: [], cards: [], pokemons: [], prices: {}, rarities: [], types: [] };

	const [cards, prices, pokemons, types] = await Promise.all([getCards(), getPrices(), getPokemons(), getTypes()]);

	const wanted = new Set(itemCodes);
	const userCards = cards.filter(card => wanted.has(card.cardCode));
	// The grid reads the dex number back out of the card code, so the map is keyed on the same value the tile looks up.
	const dexIds = new Set(userCards.map(card => parseCardCode(card.cardCode).pokemonNumber ?? card.pokemonNumber));

	return {
		// The filter lists describe these cards rather than the whole catalogue: a 200-card collection got 1700 artists to pick from.
		artists: distinctArtists(userCards),
		cards: userCards,
		// Only the Pokémon these cards name: the full table is 1025 rows carrying their Pokédex entries, for a name lookup.
		pokemons: pokemons.filter(pokemon => dexIds.has(pokemon.id)),
		// Only the prices of the cards this page draws: the whole record is 19819 entries the document never reads.
		prices: Object.fromEntries(userCards.map(card => [card.cardCode, prices[card.cardCode]]).filter(([, price]) => price)),
		rarities: distinctRarities(userCards),
		types,
	};
}

interface UserCardsPageOptions {
	client: SupabaseClient;
	/** The viewer's own rows, already loaded by the root layout, so their own page costs no extra query. */
	ownItems: CardItem[] | null | undefined;
	fetchItems: (username: string, client: SupabaseClient) => Promise<{ data: CardItem[] | null; error: unknown }>;
	kind: UserCardsKind;
	loggedInUsername: string | null;
	requestedUsername: string;
}

/**
 * Shared load for `/collection/[user]` and `/wishlist/[user]`: they differ only in the table they read and the words
 * they print. The card payload is streamed, and the catalogue is never touched for a page the visitor cannot see.
 */
export async function loadUserCardsPage({ client, fetchItems, kind, loggedInUsername, ownItems, requestedUsername }: UserCardsPageOptions) {
	const copy = USER_CARDS_COPY[kind];
	const { data: targetProfile, error: profileError } = await getProfileByUsername(requestedUsername, client);

	if (profileError || !targetProfile) {
		return {
			breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }),
			description: `${copy.label} for user ${requestedUsername} could not be found or user does not exist.`,
			heading: 'User Not Found',
			isOwner: false,
			isPublic: false,
			noindex: true,
			schemas: [],
			streamed: { payload: buildPayload([]) },
			targetProfile: null as UserProfile | null,
			targetUsername: requestedUsername,
			title: 'User Not Found',
			type: 'CollectionPage' as const,
		};
	}

	// Usernames resolve case-insensitively, so send both the browser and the crawler to the stored casing.
	if (targetProfile.username !== requestedUsername) redirect(307, `/${kind}/${encodeURIComponent(targetProfile.username)}`);

	const username = targetProfile.username;
	const isOwner = loggedInUsername === username;
	const isPublic = targetProfile.is_public;
	const canRead = isPublic || isOwner;

	const items = canRead
		? isOwner
			? ownItems ?? []
			: (await fetchItems(username, client)).data ?? []
		: [];

	return {
		breadcrumbs: breadcrumbs(
			{ name: 'Collectors', url: '/users' },
			{ name: username, url: `/profile/${username}` },
			{ name: copy.crumb, url: `/${kind}/${username}` }
		),
		description: canRead ? (isOwner ? copy.ownDescription : copy.publicDescription(username)) : copy.privateDescription,
		// The heading is the short form; `title` stays the long one the crawler indexes.
		heading: canRead ? (isOwner ? copy.ownTitle : `${username}'s ${copy.label}`) : copy.privateHeading,
		isOwner,
		isPublic,
		// Only a public profile's cards are public content; everything else is a shell the crawler must not keep.
		noindex: !isPublic,
		schemas: isPublic ? [profileSchema(targetProfile, `/${kind}/${username}`)] : [],
		streamed: { payload: buildPayload(items.map(item => item.card_code)) },
		targetProfile,
		targetUsername: username,
		title: canRead ? (isOwner ? copy.ownTitle : copy.publicTitle(username)) : copy.privateTitle,
		type: 'CollectionPage' as const,
	};
}

export type UserCardsPageData = Awaited<ReturnType<typeof loadUserCardsPage>>;
