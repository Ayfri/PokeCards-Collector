import type { SupabaseClient } from '@supabase/supabase-js';
import type { BinderShareInput } from '#helpers/binder.ts';
import type { BinderShareRow, BinderShareSummary, ServiceResponse } from '#lib/types.js';

function failure(message: string, error: unknown): { data: null; error: Error | string } {
	console.error(message, error);
	return { data: null, error: error instanceof Error ? error : String(error) };
}

/** These functions take the client of the request (`locals.supabase`), so row level security decides who may write: never pass a service-role client. */
export async function createBinderShare(client: SupabaseClient, username: string, input: BinderShareInput): Promise<ServiceResponse<{ id: string }>> {
	try {
		const { data, error } = await client
			.from('binder_shares')
			.insert({ name: input.name, pages: input.pages, pocket_columns: input.pocketColumns, pocket_rows: input.pocketRows, username })
			.select('id')
			.single();
		return { data, error };
	} catch (error) {
		return failure('Error creating binder share:', error);
	}
}

/** `deleted` is false when no row matched, which is also what a row of another user looks like: row level security hides it. */
export async function deleteBinderShare(client: SupabaseClient, id: string): Promise<ServiceResponse<{ deleted: boolean }>> {
	try {
		const { count, error } = await client.from('binder_shares').delete({ count: 'exact' }).eq('id', id);
		return { data: error ? null : { deleted: (count ?? 0) > 0 }, error };
	} catch (error) {
		return failure('Error deleting binder share:', error);
	}
}

/**
 * The table is public read, so the username filter is what makes this the owner's list. PostgREST cannot count the elements of a jsonb column without a SQL
 * function, so `pages` is selected and counted here: at most 20 rows of 64 kB, and only for the signed-in owner opening the share dialog.
 */
export async function listBinderShares(client: SupabaseClient, username: string): Promise<ServiceResponse<BinderShareSummary[]>> {
	try {
		const { data, error } = await client
			.from('binder_shares')
			.select('id, name, pages, created_at')
			.eq('username', username)
			.order('created_at', { ascending: false });
		const rows: Pick<BinderShareRow, 'created_at' | 'id' | 'name' | 'pages'>[] = data ?? [];
		return { data: error ? null : rows.map(row => ({ createdAt: row.created_at, id: row.id, name: row.name, pageCount: row.pages.length })), error };
	} catch (error) {
		return failure('Error listing binder shares:', error);
	}
}

export async function getBinderShare(client: SupabaseClient, id: string): Promise<ServiceResponse<BinderShareRow>> {
	try {
		const { data, error } = await client
			.from('binder_shares')
			.select('id, name, pages, pocket_columns, pocket_rows, username, created_at')
			.eq('id', id)
			.maybeSingle();
		return { data, error };
	} catch (error) {
		return failure('Error getting binder share:', error);
	}
}
