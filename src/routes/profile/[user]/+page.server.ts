import { LANGUAGES } from '#helpers/catalogues.ts';
import { countCards, getOwnedCards, getSets } from '#helpers/catalogue-data.ts';
import { redirect } from '@sveltejs/kit';
import { formatEuros } from '#helpers/format.ts';
import { ogImage } from '#helpers/og-image.ts';
import { collectionStats as buildCollectionStats } from '#helpers/owned-cards.ts';
import { getProfileByUsername } from '#lib/services/profiles.ts';
import type { PageServerLoad } from './$types';
import { breadcrumbs, profileSchema } from '#helpers/seo.ts';
import type { CollectionStats } from '#lib/types.js';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const requestedUsername = params.user;
	/** The profile lookup runs in parallel with the layout load instead of waiting for it. */
	const profilePromise = getProfileByUsername(requestedUsername, locals.supabase);
	/** Read in parallel with the profile: row level security already hides a private collection, so reading early leaks nothing. */
	const collectionRead = getOwnedCards(locals.supabase, requestedUsername, 'collection', true);
	/** A redirect or a private profile never awaits it, and a rejection nobody awaits would be logged as unhandled. */
	collectionRead.catch(() => {});
	/** A failed wishlist read leaves the wishlist figures at zero instead of dropping the collection stats. */
	const wishlistRead = getOwnedCards(locals.supabase, requestedUsername, 'wishlist').catch((cause: unknown) => {
		console.error(`Error fetching the wishlist stats of ${requestedUsername}:`, cause);
		return { cards: [], codes: 0, rows: 0, sets: [] };
	});
	const { profile: loggedInUserProfile } = await parent();
	const isOwnProfile = loggedInUserProfile?.username === requestedUsername;

	const { data: targetProfile, error: profileError } = await profilePromise;
	if (profileError || !targetProfile) redirect(307, '/');

	/** Usernames resolve case-insensitively, so browsers and crawlers are redirected to the stored casing. */
	if (targetProfile.username !== requestedUsername) redirect(307, `/profile/${encodeURIComponent(targetProfile.username)}`);

	const isPublic = targetProfile.is_public;
	let collectionStats: CollectionStats | null = null;
	let totalCards = 0;
	let title = 'Private Profile';
	let description = `This user's profile is private.`;

	if (isPublic || isOwnProfile) {
		const [counts, collection, wishlist] = await Promise.all([Promise.all(LANGUAGES.map(countCards)), collectionRead.catch((cause: unknown) => {
			console.error(`Error fetching collection stats for ${targetProfile.username}:`, cause);
			return null;
		}), wishlistRead]);
		totalCards = counts.reduce((total, count) => total + count, 0);

		if (collection) {
			/** Only the set lists of the languages the collection touches, never the cards: the stats come from `owned_cards`. */
			const languages = [...new Set(collection.sets.map(({ language }) => language))];
			const sets = Object.fromEntries(await Promise.all(languages.map(async language => [language, await getSets(language)] as const)));
			collectionStats = buildCollectionStats(collection, wishlist, sets);
		}

		title = isOwnProfile ? 'My Profile' : `${targetProfile.username}'s Pokémon Card Collection`;
		description = collectionStats
			? `${targetProfile.username} owns ${collectionStats.unique_cards} unique Pokémon cards (${collectionStats.total_instances} in total) worth around €${collectionStats.total_value.toFixed(2)} on Cardmarket. Browse the collection, the wishlist and the set completion.`
			: `Pokémon TCG collector profile for ${targetProfile.username}: collection, wishlist and set completion.`;
	}

	return {
		breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }, { name: targetProfile.username, url: `/profile/${targetProfile.username}` }),
		collectionStats,
		description,
		/** Versioned on public numbers only: the owner of a private profile sees its stats, but the image never draws them. */
		image: isPublic && collectionStats
			? ogImage(
				{ kind: 'profile', username: targetProfile.username },
				`${targetProfile.username}'s Pokémon card collection: ${collectionStats.unique_cards} unique cards worth ${formatEuros(collectionStats.total_value)}, with the most valuable ones`,
				collectionStats.unique_cards,
				collectionStats.total_instances,
				collectionStats.total_value,
				collectionStats.top_cards.map(({ card }) => card.cardCode).join(),
			)
			: ogImage({ kind: 'profile', username: targetProfile.username }, `${targetProfile.username}'s private Pokémon card collector profile`, 'private'),
		isOwnProfile,
		isPublic,
		/**
		 * A private profile must not be indexed: a crawler would otherwise store the "private profile" shell under a real username.
		 * A public one with no card is thin content, one of dozens of identical empty pages, so it waits for its first card.
		 */
		noindex: !isPublic || !collectionStats?.unique_cards,
		schemas: isPublic
			? [profileSchema(targetProfile, `/profile/${targetProfile.username}`, collectionStats
				? { cards: collectionStats.total_instances, uniqueCards: collectionStats.unique_cards }
				: undefined)]
			: [],
		targetProfile,
		title,
		totalCards,
		type: 'ProfilePage' as const,
	};
};
