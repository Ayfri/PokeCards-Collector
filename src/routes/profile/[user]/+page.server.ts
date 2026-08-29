import { getCards, getPrices } from '$helpers/supabase-data';
import { error, redirect } from '@sveltejs/kit';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import { breadcrumbs, profileSchema } from '$helpers/seo';
import type { UserProfile, CollectionStats, ServiceResponse } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { profile: loggedInUserProfile, sets: parentSets, ...layoutData } = await parent();

	const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
	const sets = parentSets || [];

	const requestedUsername = params.user;
	const loggedInUsername = loggedInUserProfile?.username ?? null;

	// If accessing /profile without a specific user in params and logged in, redirect to own profile
	if (!requestedUsername && loggedInUsername) {
		const correctUrl = `/profile/${encodeURIComponent(loggedInUsername)}`;
		throw redirect(307, correctUrl);
	}

	let targetProfile: UserProfile | null = null;
	let isPublic = false;
	let isOwnProfile = false;
	let collectionStats: CollectionStats | null = null;
	let title = 'Profile';
	let description = 'Pokémon TCG user profile.';

	if (!requestedUsername) {
		// This case should ideally be handled if user is not logged in, or further refined.
		// For now, if no requestedUsername and not caught by the redirect above, assume it's an attempt to view own profile without being logged in.
		title = 'View Profile';
		description = 'Please log in to view your profile or specify a user.';
		return {
			...layoutData,
			allCards,
			sets,
			prices,
			targetProfile: null,
			isPublic: false,
			collectionStats: null,
			isOwnProfile: false,
			loggedInUsername,
			title,
			description,
			noindex: true
		};
	}

	isOwnProfile = loggedInUsername === requestedUsername;

	const { data: fetchedProfile, error: profileError } = await getProfileByUsername(requestedUsername, locals.supabase);
	targetProfile = fetchedProfile;

	if (profileError || !targetProfile) {
		throw redirect(307, '/');
	}

	// If the username from the database (case-preserved) is different from the one in the URL (potentially different case),
	// redirect to the canonical URL with the correct casing.
	if (targetProfile.username !== requestedUsername) {
		const correctUrl = `/profile/${encodeURIComponent(targetProfile.username)}`;
		throw redirect(307, correctUrl);
	}

	isPublic = targetProfile.is_public;

	if ((isPublic || isOwnProfile) && targetProfile.username) {
		// Ensure allCards, sets, prices are correctly passed to getCollectionStats
		const { data: stats, error: statsError } = await getCollectionStats(targetProfile.username, allCards, sets, prices, locals.supabase);
		if (statsError) {
			console.error(`Error fetching collection stats for ${targetProfile.username}:`, statsError);
		} else {
			collectionStats = stats;
		}
		title = isOwnProfile ? 'My Profile' : `${targetProfile.username}'s Pokémon Card Collection`;
		description = collectionStats
			? `${targetProfile.username} owns ${collectionStats.unique_cards} unique Pokémon cards (${collectionStats.total_instances} in total) worth around €${collectionStats.total_value.toFixed(2)} on Cardmarket. Browse the collection, the wishlist and the set completion.`
			: `Pokémon TCG collector profile for ${targetProfile.username}: collection, wishlist and set completion.`;
	} else if (!isPublic && !isOwnProfile) {
		title = 'Private Profile';
		description = `This user's profile is private.`;
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo', width: 485, height: 436 };

	// A private profile, and a page only its owner can read, must never reach an index: the content is not public
	// and the crawler would otherwise store the "private profile" shell under a real username.
	const noindex = !isPublic;
	const schemas = isPublic && targetProfile
		? [profileSchema(targetProfile, `/profile/${targetProfile.username}`, collectionStats
			? { cards: collectionStats.total_instances, uniqueCards: collectionStats.unique_cards }
			: undefined)]
		: [];

	return {
		...layoutData,
		allCards,
		sets,
		prices,
		targetProfile,
		isPublic,
		collectionStats,
		isOwnProfile,
		loggedInUsername,
		title,
		description,
		image: ogImage,
		breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }, { name: targetProfile.username, url: `/profile/${targetProfile.username}` }),
		noindex,
		schemas,
		type: 'ProfilePage' as const,
	};
};
