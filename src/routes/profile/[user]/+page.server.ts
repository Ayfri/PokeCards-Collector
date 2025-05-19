import { error, redirect } from '@sveltejs/kit';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { profile, allCards, sets, prices, ...layoutData } = await parent();
	const requestedUsername = params.user;
	const loggedInUsername = profile?.username ?? null;

	// If not ?user=... and logged in, redirect to ?user=username
	if (!requestedUsername && loggedInUsername) {
		const correctUrl = `/profile/${encodeURIComponent(loggedInUsername)}`;
		throw redirect(307, correctUrl);
	}

	let targetProfile = null;
	let isPublic = false;
	let isOwnProfile = false;
	let collectionStats = null;
	let profileError = null;
	let title = 'Profile';
	let description = 'Pokémon TCG user profile.';
	let usernameToLoad = requestedUsername;

	isOwnProfile = loggedInUsername === requestedUsername;

	({ data: targetProfile, error: profileError } = await getProfileByUsername(requestedUsername));

	if (profileError || !targetProfile) {
		title = 'User Not Found';
		description = `Profile for user ${requestedUsername} could not be found.`;
		return {
			...layoutData,
			allCards, sets, prices, // from parent
			targetProfile: null,
			isPublic: false,
			collectionStats: null,
			isOwnProfile,
			loggedInUsername,
			title,
			description
		};
	}

	if (targetProfile.username !== requestedUsername) {
		const correctUrl = `/profile/${encodeURIComponent(targetProfile.username)}`; // Corrected query param
		throw redirect(307, correctUrl);
	}

	isPublic = targetProfile.is_public;
	usernameToLoad = targetProfile.username;

	if ((isPublic || isOwnProfile) && usernameToLoad) {
		const { data: stats, error: statsError } = await getCollectionStats(usernameToLoad, allCards, sets, prices);
		if (statsError) {
			console.error(`Error fetching collection stats for ${usernameToLoad}:`, statsError);
		} else {
			collectionStats = stats;
		}
		title = isOwnProfile ? 'My Profile' : `${usernameToLoad}'s Profile`;
		description = `Pokémon TCG profile for user ${usernameToLoad}.`;
	} else {
		title = 'Private Profile';
		description = `This user's profile is private.`;
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		...layoutData,
		allCards, // from parent
		sets,     // from parent
		prices,   // from parent
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