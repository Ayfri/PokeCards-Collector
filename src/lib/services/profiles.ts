import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, supabase } from '#lib/supabase.ts';
import type { PublicProfile, SearchedUser, ServiceResponse } from '#lib/types.js';

export async function getProfileByAuthId(authId: string, client: SupabaseClient) {
	return client
		.from('profiles')
		.select('*')
		.eq('auth_id', authId)
		.single();
}

/** Every column but `auth_id`, so a profile read for another visitor never carries the owner's account id. */
export async function getProfileByUsername(username: string, client: SupabaseClient): Promise<ServiceResponse<PublicProfile>> {
	return client
		.from('profiles')
		.select('username, is_public, profile_color, created_at, updated_at')
		.eq('username', username.toLowerCase())
		.single();
}

export async function toggleProfileVisibility(username: string, isPublic: boolean, client: SupabaseClient = getSupabaseBrowserClient()) {
	return client
		.from('profiles')
		.update({ is_public: isPublic })
		.eq('username', username)
		.select()
		.single();
}

/**
 * Bounded at 5 s, because a hanging lookup would leave the registration form waiting forever. The caller must pass a
 * service-role client: a taken username may belong to a private profile that no anonymous read can see.
 */
export async function isUsernameTaken(username: string, client: SupabaseClient): Promise<ServiceResponse<boolean>> {
	const { data, error } = await client
		.from('profiles')
		.select('username')
		.eq('username', username.toLowerCase())
		.abortSignal(AbortSignal.timeout(5000))
		.limit(1);

	return { data: data && data.length > 0, error };
}

/**
 * Public collectors whose name contains `query`, most unique cards first; an empty query lists the top collectors.
 * The RPC returns every profile column including `auth_id`, which is dropped here so no caller can forward it.
 */
export async function searchUsers(query: string, limit: number): Promise<ServiceResponse<SearchedUser[]>> {
	const { data, error } = await supabase.rpc('search_public_users_with_stats', {
		p_limit: limit,
		p_query: query.toLowerCase().trim()
	});

	if (error) {
		console.error('Supabase RPC error searching users with stats:', error);
		return { data: null, error };
	}

	return { data: (data as (SearchedUser & { auth_id: string })[]).map(({ auth_id, ...user }) => user), error: null };
}
