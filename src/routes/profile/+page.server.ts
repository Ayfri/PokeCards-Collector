import { error, redirect } from '@sveltejs/kit';
import { getCards, getSets, getPrices } from '$helpers/data';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { supabase, user, profile } }) => {
	const requestedUsername = url.searchParams.get('user');
	const loggedInUsername = profile?.username ?? null; // Get logged-in user's username

	// If not ?user=... and logged in, redirect to ?user=username
	if (!requestedUsername && loggedInUsername) {
		const correctUrl = `/profile?user=${encodeURIComponent(loggedInUsername)}`;
		throw redirect(307, correctUrl);
	}

	// Load base data needed for stats
	let allCards = await getCards();
	let sets = await getSets();
	let prices = await getPrices();

	let targetProfile = null;
	let isPublic = false;
	let isOwnProfile = false;
	let collectionStats = null;
	let profileError = null;
	let title = 'Profile';
	let description = 'Pokémon TCG user profile.';
	let usernameToLoad = requestedUsername; // Variable to hold the username we're actually loading data for

	if (!requestedUsername) {
		// Viewing logged-in user's profile
		if (!loggedInUsername) {
			// Not logged in, redirect or handle as appropriate
			// For now, returning minimal data; client might redirect
			return {
				allCards, sets, prices,
				targetProfile: null,
				isPublic: false,
				collectionStats: null,
				isOwnProfile: false,
				loggedInUsername: null,
				title: 'Profile',
				description: 'Sign in to view your profile.'
			};
		}

		// Fetch logged-in user's profile and stats
		targetProfile = profile; // Use profile from locals
		isPublic = profile?.is_public ?? false; // Use profile from locals
		isOwnProfile = true;
		usernameToLoad = loggedInUsername; // Use logged-in user's name
		title = 'My Profile';
		description = 'Your Pokémon TCG profile.';

		const { data: stats, error: statsError } = await getCollectionStats(loggedInUsername, allCards, sets, prices);
		if (statsError) {
			console.error(`Error fetching collection stats for ${loggedInUsername}:`, statsError);
			// Return null stats, but page can still render
		} else {
			collectionStats = stats;
		}

	} else {
		// Viewing a specific user's profile
		isOwnProfile = loggedInUsername === requestedUsername;

		({ data: targetProfile, error: profileError } = await getProfileByUsername(requestedUsername));

		if (profileError || !targetProfile) {
			title = 'User Not Found';
			description = `Profile for user ${requestedUsername} could not be found.`;
			// Return early, no need to check redirect or fetch stats
			return {
				allCards, sets, prices,
				targetProfile: null,
				isPublic: false,
				collectionStats: null,
				isOwnProfile,
				loggedInUsername,
				title,
				description
			};
		}

		// Check casing and redirect if needed *before* further processing
		if (targetProfile.username !== requestedUsername) {
			const correctUrl = `/profile?user=${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}

		isPublic = targetProfile.is_public;
		usernameToLoad = targetProfile.username; // Use the correct-cased username

		if ((isPublic || isOwnProfile) && usernameToLoad) {
			// Fetch stats if profile is public OR if it's the logged-in user viewing their own (potentially private) profile
			const { data: stats, error: statsError } = await getCollectionStats(usernameToLoad, allCards, sets, prices);
			if (statsError) {
				console.error(`Error fetching collection stats for ${usernameToLoad}:`, statsError);
				// Return null stats
			} else {
				collectionStats = stats;
			}
			title = isOwnProfile ? 'My Profile' : `${usernameToLoad}'s Profile`;
			description = `Pokémon TCG profile for user ${usernameToLoad}.`;
		} else {
			// Profile is private and not owned by the viewer
			title = 'Private Profile';
			description = `This user's profile is private.`;
		}
	}

	// At the end, always use favicon.png as Open Graph image
	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		allCards,
		sets,
		prices,
		targetProfile, // Might be null if user not found or logged-in user request without session
		isPublic,
		collectionStats, // Might be null if error or private
		isOwnProfile,
		loggedInUsername, // Pass the logged-in user's name
		title,
		description,
		image: ogImage,
	};
}; 