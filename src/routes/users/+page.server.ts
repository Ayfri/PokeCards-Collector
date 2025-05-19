import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import { getCollectionStats } from '$lib/services/collections';
import type { UserProfile, Card, Set, PriceData } from '$lib/types';

interface FeaturedUser extends UserProfile {
	card_count: number;
	unique_card_count: number;
}

export const load: PageServerLoad = async ({ parent }) => {
	const { allCards, sets, prices } = await parent() as { allCards: Card[], sets: Set[], prices: Record<string, PriceData> };
	let featuredUsers: FeaturedUser[] = [];
	let featuredUsersError: string | null = null;

	try {
		const { data: publicProfiles, error: profilesError } = await supabase
			.from('profiles')
			.select('auth_id, username, is_public, profile_color, created_at')
			.eq('is_public', true)
			.limit(20);

		if (profilesError) {
			console.error('Error fetching public profiles:', profilesError);
			throw new Error('Could not fetch public profiles.');
		}

		if (publicProfiles) {
			const profilesWithStatsPromises = publicProfiles.map(async (profile) => {
				const { data: stats, error: statsServiceError } = await getCollectionStats(
					profile.username,
					allCards || [],
					sets || [],
					prices || {}
				);

				let cardCount = 0;
				let uniqueCardCount = 0;
				if (statsServiceError) {
					let errorMessage = 'Unknown error fetching stats';
					if (typeof statsServiceError === 'string') {
						errorMessage = statsServiceError;
					} else if (statsServiceError && typeof statsServiceError === 'object' && 'message' in statsServiceError) {
						errorMessage = (statsServiceError as { message: string }).message;
					}
					console.warn(`Error fetching stats for ${profile.username}:`, errorMessage);
				} else if (stats) {
					cardCount = stats.total_instances || 0;
					uniqueCardCount = stats.unique_cards || 0;
				}
				return {
					...profile,
					profile_color: profile.profile_color ?? null,
					card_count: cardCount,
					unique_card_count: uniqueCardCount
				} as FeaturedUser;
			});

			const resolvedProfilesWithStats = await Promise.all(profilesWithStatsPromises);

			featuredUsers = resolvedProfilesWithStats
				.sort((a, b) => b.unique_card_count - a.unique_card_count)
				.slice(0, 5);
		}
	} catch (error: any) {
		console.error('Error preparing featured users:', error);
		featuredUsersError = error.message || 'An unexpected error occurred while fetching featured users.';
	}

	return {
		featuredUsers,
		featuredUsersError,
		title: 'Users - PokéStats',
		description: 'Discover and search for fellow Pokémon TCG collectors. See featured collectors with the largest collections.'
	};
};
