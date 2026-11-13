import { redirect } from '@sveltejs/kit';
import { distinctArtists, distinctRarities } from '#helpers/card-grid.ts';
import { breadcrumbs, profileSchema } from '#helpers/seo.ts';
import { ogImage } from '#helpers/og-image.ts';
import { ownedTotals, USER_CARDS_WORDING, type UserCardsKind, type UserCardsSummary } from '#helpers/owned-cards.ts';
import { getOwnedCards, getPokemons, getSets, getTypes, type OwnedCards } from '#helpers/catalogue-data.ts';
import { getProfileByUsername } from '#lib/services/profiles.ts';
import type { FullCard, GridPokemon, PublicProfile, Set, UserProfile } from '#lib/types.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Everything the grid draws for one user's cards. Streamed, so the profile lookup answers before the catalogue is read. */
interface UserCardsPayload {
	artists: string[];
	cards: FullCard[];
	pokemons: GridPokemon[];
	rarities: string[];
	/** The Japanese and French sets of the owned cards, to add to the English ones the load carries. */
	sets: Set[];
	types: string[];
}

/** How many top cards the HTML names: the document stays small and the line stays on one row. */
const SUMMARY_TOP_CARDS = 5;

const EMPTY_PAYLOAD: UserCardsPayload = { artists: [], cards: [], pokemons: [], rarities: [], sets: [], types: [] };

const EMPTY_OWNED: OwnedCards = { cards: [], codes: 0, rows: 0, sets: [] };

/** A missing, private or empty page draws no grid, so it skips the Pokémon and set reads. */
async function buildPayload(owned: OwnedCards): Promise<UserCardsPayload> {
	if (owned.cards.length === 0) return EMPTY_PAYLOAD;

	const cards = owned.cards.map(({ copies, ...card }) => card);
	const dexIds = new Set(cards.map(card => card.pokemonNumber));
	const [pokemons, types, otherSets] = await Promise.all([
		getPokemons(),
		getTypes(),
		/** The English sets come with the load itself, so only the sets of the other catalogues' owned cards travel. */
		Promise.all((['ja', 'fr'] as const).map(async language => {
			const ownedSetIds = new Set(cards.filter(card => card.language === language).map(card => card.setId));
			return ownedSetIds.size ? (await getSets(language)).filter(set => ownedSetIds.has(set.setId)).map(set => ({ ...set, language })) : [];
		})),
	]);

	return {
		/** The filter lists come from these cards, not the whole catalogue: a 200-card collection would otherwise offer 1700 artists. */
		artists: distinctArtists(cards),
		cards,
		/** Only the Pokémon these cards name: the full table is 1025 rows with their Pokédex entries, just to look up a name. */
		pokemons: pokemons.filter(pokemon => dexIds.has(pokemon.id)).map(({ id, name }) => ({ id, name })),
		rarities: distinctRarities(cards),
		sets: otherSets.flat(),
		types,
	};
}

function summaryOf(owned: OwnedCards): UserCardsSummary | null {
	if (owned.rows === 0) return null;

	const { copies, top, totalValue, uniqueCards } = ownedTotals(owned);
	return {
		copies,
		topCards: top.slice(0, SUMMARY_TOP_CARDS).map(({ cardCode, language, localId, name, price, setId, setName }) => ({ cardCode, language, localId, name, price, setId, setName })),
		totalValue,
		uniqueCards,
	};
}

/** The root layout's data this load reads: the viewer's profile, to tell the owner from a visitor. */
interface ViewerData {
	profile: UserProfile | null;
}

interface UserCardsPageOptions {
	client: SupabaseClient;
	kind: UserCardsKind;
	parent: () => Promise<ViewerData>;
	requestedUsername: string;
}

/**
 * Shared load for `/collection/[user]` and `/wishlist/[user]`: they differ only in the list they read and the words
 * they print. The card payload is streamed, and no catalogue table is read for the cards: `getOwnedCards` resolves them in one call.
 */
export async function loadUserCardsPage({ client, kind, parent, requestedUsername }: UserCardsPageOptions) {
	const wording = USER_CARDS_WORDING[kind];
	/** Read in parallel with the profile: row level security hands a visitor who may not see the list an empty one, so reading early leaks nothing. */
	const ownedRead = getOwnedCards(client, requestedUsername, kind);
	/** The not-found, redirect and private paths never read it, and a rejection nobody awaits would be logged as unhandled. */
	ownedRead.catch(() => {});
	/** The profile lookup runs in parallel with the layout load instead of waiting for it. */
	const [{ data: targetProfile, error: profileError }, viewer] = await Promise.all([getProfileByUsername(requestedUsername, client), parent()]);

	if (profileError || !targetProfile) {
		return {
			breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }),
			description: `${wording.label} for user ${requestedUsername} could not be found or user does not exist.`,
			heading: 'User Not Found',
			isOwner: false,
			isPublic: false,
			noindex: true,
			schemas: [],
			sets: [] as Set[],
			streamed: { payload: Promise.resolve(EMPTY_PAYLOAD) },
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

	const owned = canRead ? ownedRead : Promise.resolve(EMPTY_OWNED);
	/** Awaited so the HTML names the numbers and the top cards, since a crawler that skips JavaScript never sees the streamed grid. A failed read leaves the summary out and the stream shows the error. */
	const summary = await owned.then(summaryOf, () => null);

	return {
		breadcrumbs: breadcrumbs(
			{ name: 'Collectors', url: '/users' },
			{ name: username, url: `/profile/${username}` },
			{ name: wording.crumb, url: `/${kind}/${username}` }
		),
		description: canRead ? (isOwner ? wording.ownDescription : wording.publicDescription(username, summary)) : wording.privateDescription,
		/** `heading` is the short form shown on the page, `title` the long one the crawler indexes. */
		heading: canRead ? (isOwner ? wording.ownTitle : `${username}'s ${wording.label}`) : wording.privateHeading,
		/** Versioned on what the image draws (copies, unique cards, value in cents, top cards) of a public list only, so a private one never feeds what the owner sees into its URL. */
		image: ogImage(
			{ kind, username },
			isPublic ? `${username}'s Pokémon card ${kind}: ${summary?.uniqueCards ?? 0} unique cards, their value and the most valuable ones` : `${username}'s private Pokémon card ${kind}`,
			...(isPublic ? [summary?.copies ?? 0, summary?.uniqueCards ?? 0, Math.round((summary?.totalValue ?? 0) * 100), summary?.topCards.map(card => card.cardCode).join() ?? ''] : ['private']),
		),
		isOwner,
		isPublic,
		/** Only a public profile's cards are public content, anything else (an empty public list included) is a shell the crawler must not index. */
		noindex: !isPublic || !summary,
		schemas: isPublic ? [profileSchema(targetProfile, `/${kind}/${username}`)] : [],
		/** The English sets the filters and the import dialog list. */
		sets: await getSets(),
		streamed: { payload: owned.then(buildPayload) },
		summary,
		targetProfile,
		targetUsername: username,
		title: canRead ? (isOwner ? wording.ownTitle : wording.publicTitle(username)) : wording.privateTitle,
		type: 'CollectionPage' as const,
	};
}

export type UserCardsPageData = Awaited<ReturnType<typeof loadUserCardsPage>>;
