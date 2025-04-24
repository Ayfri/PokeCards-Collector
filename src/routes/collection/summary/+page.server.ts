import { error, redirect } from '@sveltejs/kit';
import { getCards, getSets, getPrices } from '$helpers/data';
import { getUserCollection, getCollectionStats } from '$lib/services/collections';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const targetUsername = url.searchParams.get('user');

	// Always load base data that will be needed
	let allCards = [];
	let sets = [];
	let prices = {};
	
	try {
		allCards = await getCards();
		sets = await getSets();
		prices = await getPrices();
	} catch (e) {
		console.error("Error loading global card data:", e);
		throw error(500, 'Failed to load necessary card data');
	}

	if (targetUsername) {
		// Viewing a specific user
		let targetProfile = null;
		let profileError = null;

		({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

		if (profileError || !targetProfile) {
			return {
				allCards, sets, prices,
				targetProfile: null,
				isPublic: false,
				collectionStats: null,
				targetUsername,
				title: 'User Not Found',
				description: `Collection for user ${targetUsername} could not be found.`,
			};
		}

		// Check casing and redirect if needed
		if (targetProfile.username !== targetUsername) {
			const correctUrl = `/collection/summary?user=${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}

		if (targetProfile.is_public) {
			// Get collection stats for public profile
			const { data: collectionStats, error: statsError } = await getCollectionStats(targetProfile.username);
			
			if (statsError) {
				console.error(`Error fetching collection stats for ${targetProfile.username}:`, statsError);
				throw error(500, `Failed to load collection stats for ${targetProfile.username}`);
			}

			return {
				allCards, sets, prices,
				targetProfile,
				isPublic: true,
				collectionStats,
				targetUsername: targetProfile.username,
				title: `${targetProfile.username}'s Collection Summary`,
				description: `Pokémon TCG collection summary for user ${targetProfile.username}.`,
			};
		} else {
			// Profile is private
			return {
				allCards, sets, prices,
				targetProfile,
				isPublic: false,
				collectionStats: null,
				targetUsername: targetProfile.username,
				title: 'Private Collection',
				description: `This user's collection is private.`,
			};
		}
	} else {
		// Viewing own collection summary (no ?user param)
		// Client will handle fetching the data
		return {
			allCards, sets, prices,
			targetProfile: null,
			isPublic: false,
			collectionStats: null,
			targetUsername: null,
			title: 'My Collection Summary',
			description: 'Summary of your Pokémon TCG card collection.',
		};
	}
}; 