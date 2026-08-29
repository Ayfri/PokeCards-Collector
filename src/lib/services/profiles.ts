import { supabase } from '../supabase';
import type { UserProfile, ServiceResponse, UsernameCheckResult } from '../types';

export async function createProfile(username: string, authId: string) {
	try {
		const normalizedUsername = username.toLowerCase();
		const { data, error } = await supabase
			.from('profiles')
			.insert({
				username: normalizedUsername,
				auth_id: authId,
				is_public: true
			})
			.select()
			.single();

		return { data, error };
	} catch (error) {
		console.error('Error creating profile:', error);
		return { data: null, error };
	}
}

export async function getProfileByAuthId(authId: string) {
	try {
		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('auth_id', authId)
			.single();

		return { data, error };
	} catch (error) {
		console.error('Error getting profile:', error);
		return { data: null, error };
	}
}

export async function getProfileByUsername(username: string): Promise<ServiceResponse<UserProfile>> {
	try {
		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.ilike('username', username)
			.single();

		return { data, error } as ServiceResponse<UserProfile>;
	} catch (error) {
		console.error('Error getting profile by username:', error);
		return { data: null, error: error instanceof Error ? error : String(error) };
	}
}

export async function updateProfile(username: string, profileData: Partial<UserProfile>) {
	try {
		const { data, error } = await supabase
			.from('profiles')
			.update(profileData)
			.eq('username', username)
			.select()
			.single();

		return { data, error };
	} catch (error) {
		console.error('Error updating profile:', error);
		return { data: null, error };
	}
}

export async function toggleProfileVisibility(username: string, isPublic: boolean) {
	try {
		const { data, error } = await supabase
			.from('profiles')
			.update({ is_public: isPublic })
			.eq('username', username)
			.select()
			.single();

		if (error) {
			return { data: null, error };
		}

		return { data, error: null };
	} catch (error) {
		return { data: null, error };
	}
}

/** Bounded at 5 s: a hanging lookup would leave the registration form waiting forever. */
export async function isUsernameTaken(username: string): Promise<UsernameCheckResult> {
	try {
		const { data, error } = await supabase
			.from('profiles')
			.select('username')
			.eq('username', username.toLowerCase())
			.abortSignal(AbortSignal.timeout(5000))
			.limit(1);

		if (error) return { exists: false, error: error.message };

		return { exists: (data?.length ?? 0) > 0, error: null };
	} catch (error) {
		return { exists: false, error: error instanceof Error ? error : String(error) };
	}
}

export async function searchUsers(query: string, limit: number = 10) {
	try {
		if (!query || query.trim() === '') {
			return { data: [], error: null };
		}

		const normalizedQuery = query.toLowerCase().trim();

		const { data, error } = await supabase.rpc('search_public_users_with_stats', {
			p_query: normalizedQuery,
			p_limit: limit
		});

		if (error) {
			console.error('Supabase RPC error searching users with stats:', error);
			return { data: null, error };
		}

		return { data, error: null };

	} catch (error) {
		console.error('Exception in searchUsers function:', error);
		return { data: null, error: String(error) };
	}
}
