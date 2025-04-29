import { error, redirect } from '@sveltejs/kit';
import { getCards, getSets, getPrices } from '$helpers/data';
import { getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const targetUsername = url.searchParams.get('user');

	// Load base data needed for stats
	let allCards = await getCards();
	let sets = await getSets();
	let prices = await getPrices();

	// If no username specified, don't try to load profile data
	// The client-side will handle the current user's profile
	if (!targetUsername) {
		return {
			allCards, sets, prices,
			targetProfile: null,
			isPublic: false,
			collectionStats: null,
			targetUsername: null,
			title: 'My Profile',
			description: 'Your Pokémon TCG profile.',
		};
	}

	// Viewing a specific user's profile
	let targetProfile = null;
	let profileError = null;

	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
		return {
			allCards,
			sets,
			prices,
			targetProfile: null,
			isPublic: false,
			collectionStats: null,
			targetUsername,
			title: 'User Not Found',
			description: `Profile for user ${targetUsername} could not be found.`,
		};
	}

	// Check casing and redirect if needed
	if (targetProfile.username !== targetUsername) {
		const correctUrl = `/profile?user=${encodeURIComponent(targetProfile.username)}`;
		throw redirect(307, correctUrl);
	}

	if (targetProfile.is_public) {
		// Get collection stats for public profile
		const { data: collectionStats, error: statsError } = await getCollectionStats(targetProfile.username, allCards, sets, prices);
		
		if (statsError) {
			console.error(`Error fetching collection stats for ${targetProfile.username}:`, statsError);
			// Don't throw an error here, just return null stats
			return {
				allCards,
				sets,
				prices,
				targetProfile,
				isPublic: true,
				collectionStats: null,
				targetUsername: targetProfile.username,
				title: `${targetProfile.username}'s Profile`,
				description: `Pokémon TCG profile for user ${targetProfile.username}.`,
			};
		}

		return {
			allCards,
			sets,
			prices,
			targetProfile,
			isPublic: true,
			collectionStats,
			targetUsername: targetProfile.username,
			title: `${targetProfile.username}'s Profile`,
			description: `Pokémon TCG profile for user ${targetProfile.username}.`,
		};
	} else {
		// Profile is private
		return {
			allCards,
			sets,
			prices,
			targetProfile,
			isPublic: false,
			collectionStats: null,
			targetUsername: targetProfile.username,
			title: 'Private Profile',
			description: `This user's profile is private.`,
		};
	}
}; 