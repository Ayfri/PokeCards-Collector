import type { PostgrestError } from '@supabase/supabase-js';

interface RangeQuery<T> {
	range(from: number, to: number): PromiseLike<{ count: number | null; data: T[] | null; error: PostgrestError | null }>;
}

/**
 * Reads every row of a select, whatever the project's per-request row cap (the dashboard's API "Max rows") is set to.
 * The first page asks for everything with an exact count, so a result under the cap costs one round trip. Past it, the
 * first page's length *is* the cap, and every missing page is requested at once.
 * `query` must build a fresh builder each call, with `count: 'exact'` and an order on a unique column: builders are single use,
 * and pages of an unstable order drop and duplicate rows.
 */
export async function selectAll<T>(query: () => RangeQuery<T>): Promise<{ data: T[]; error: null } | { data: null; error: PostgrestError }> {
	const first = await query().range(0, 999_999);
	if (first.error) return { data: null, error: first.error };

	const rows = first.data ?? [];
	const total = first.count ?? rows.length;
	if (!rows.length || rows.length >= total) return { data: rows, error: null };

	const pageSize = rows.length;
	const pages = await Promise.all(Array.from({ length: Math.ceil((total - pageSize) / pageSize) }, (_, index) => {
		const from = (index + 1) * pageSize;
		return query().range(from, from + pageSize - 1);
	}));
	const failed = pages.find(page => page.error);
	if (failed?.error) return { data: null, error: failed.error };
	return { data: rows.concat(...pages.map(page => page.data ?? [])), error: null };
}
