import { browser } from '$app/env';
import { cachedJson } from '#helpers/utils.ts';
import type { BinderPayload } from '#lib/types.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data, fetch }) => {
	/** The binder is built from localStorage, so the server renders an empty board whatever this returns. */
	if (!browser) return { ...data, catalogue: Promise.resolve<BinderPayload>({ cards: [], sets: [] }) };

	return { ...data, catalogue: cachedJson<BinderPayload>(fetch, '/api/binder') };
};
