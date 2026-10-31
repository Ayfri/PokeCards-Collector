import type { PageServerLoad } from './$types';
import { breadcrumbs } from '$helpers/seo';
import { supabase } from '$lib/supabase';
import { getUserCollection } from '$lib/services/collections';
import type { UserProfile } from '$lib/types';

interface FeaturedUser extends UserProfile {
	card_count: number;
	unique_card_count: number;
}

export const load: PageServerLoad = async ({ locals }) => {
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
			// The tiles print two counts, so each profile costs one collection read instead of the full stats pass over the catalogue.
			const profilesWithStatsPromises = publicProfiles.map(async (profile) => {
				const { data: rows, error: collectionError } = await getUserCollection(profile.username, locals.supabase);
				if (collectionError) console.warn(`Error fetching collection for ${profile.username}:`, collectionError);

				return {
					...profile,
					profile_color: profile.profile_color ?? null,
					card_count: rows?.length ?? 0,
					unique_card_count: new Set(rows?.map(row => row.card_code)).size
				} as FeaturedUser;
			});

			const resolvedProfilesWithStats = await Promise.all(profilesWithStatsPromises);

			featuredUsers = resolvedProfilesWithStats
				.sort((a, b) => b.unique_card_count - a.unique_card_count)
				.slice(0, 5);
		}
	} catch (error) {
		console.error('Error preparing featured users:', error);
		featuredUsersError = error instanceof Error ? error.message : 'An unexpected error occurred while fetching featured users.';
	}

	return {
		featuredUsers,
		featuredUsersError,
		breadcrumbs: breadcrumbs({ name: 'Collectors', url: '/users' }),
		description: 'Browse the public Pokémon TCG collections on PokéCards-Collector. See the collectors holding the most unique cards, and search for a collector by name.',
		keywords: ['Pokémon TCG collectors', 'public Pokémon collections', 'Pokémon card collection ranking'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: featuredUsers.map((user, index) => ({
				'@type': 'ListItem',
				name: user.username,
				position: index + 1,
				url: `/profile/${user.username}`,
			})),
			name: 'Featured Pokémon TCG collectors',
			numberOfItems: featuredUsers.length,
		}],
		title: 'Pokémon TCG Collectors',
		type: 'CollectionPage' as const,
	};
};
