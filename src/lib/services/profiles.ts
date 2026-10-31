import { getSupabaseBrowserClient, supabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicProfile, SearchedUserWithStats, ServiceResponse, UsernameCheckResult } from '../types';

export async function getProfileByAuthId(authId: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		const { data, error } = await client
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

/** Every column but `auth_id`, so a profile read for another visitor never carries the owner's account id. */
export async function getProfileByUsername(username: string, client: SupabaseClient = getSupabaseBrowserClient()): Promise<ServiceResponse<PublicProfile>> {
	try {
		const { data, error } = await client
			.from('profiles')
			.select('username, is_public, profile_color, created_at, updated_at')
			.eq('username', username.toLowerCase())
			.single();

		return { data, error } as ServiceResponse<PublicProfile>;
	} catch (error) {
		console.error('Error getting profile by username:', error);
		return { data: null, error: error instanceof Error ? error : String(error) };
	}
}

export async function toggleProfileVisibility(username: string, isPublic: boolean, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		const { data, error } = await client
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

/**
 * Bounded at 5 s, because a hanging lookup would leave the registration form waiting forever. The caller must pass a
 * service-role client: a taken username may belong to a private profile that no anonymous read can see.
 */
export async function isUsernameTaken(username: string, client: SupabaseClient): Promise<UsernameCheckResult> {
	try {
		const { data, error } = await client
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

/**
 * Public collectors whose name contains `query`, most unique cards first; an empty query lists the top collectors.
 * The RPC returns every profile column including `auth_id`, which is dropped here so no caller can forward it.
 */
export async function searchUsers(query: string, limit: number): Promise<ServiceResponse<SearchedUserWithStats[]>> {
	try {
		const { data, error } = await supabase.rpc('search_public_users_with_stats', {
			p_query: query.toLowerCase().trim(),
			p_limit: limit
		});

		if (error) {
			console.error('Supabase RPC error searching users with stats:', error);
			return { data: null, error };
		}

		return { data: (data as (SearchedUserWithStats & { auth_id: string })[]).map(({ auth_id, ...user }) => user), error: null };

	} catch (error) {
		console.error('Exception in searchUsers function:', error);
		return { data: null, error: String(error) };
	}
}
