import { error, redirect } from '@sveltejs/kit';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { UserProfile, CollectionStats, ServiceResponse } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { profile: loggedInUserProfile, allCards, sets, prices, ...layoutData } = await parent();
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
			description
		};
	}

	isOwnProfile = loggedInUsername === requestedUsername;

	// The getProfileByUsername function returns Promise<{ data: UserProfile | null, error: any }>
	const { data: fetchedProfile, error: fetchError } = await getProfileByUsername(requestedUsername);
	targetProfile = fetchedProfile;
	const profileError: any = fetchError; // Type as any since the service function declares it as such

	if (profileError || !targetProfile) {
		// Redirect to home page
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
		const { data: stats, error: statsError } = await getCollectionStats(targetProfile.username, allCards ?? [], sets ?? [], prices ?? {});
		if (statsError) {
			console.error(`Error fetching collection stats for ${targetProfile.username}:`, statsError);
		} else {
			collectionStats = stats;
		}
		title = isOwnProfile ? 'My Profile' : `${targetProfile.username}'s Profile`;
		description = `Pokémon TCG profile for user ${targetProfile.username}.`;
	} else if (!isPublic && !isOwnProfile) {
		title = 'Private Profile';
		description = `This user's profile is private.`;
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

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
	};
};
