import { browser } from '$app/env';
import { cachedJson } from '#helpers/utils.ts';
import type { BinderCatalogueCard } from '#lib/types.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data, fetch }) => {
	/** The binder is built from localStorage, so the server renders an empty board whatever this returns. */
	if (!browser) return { ...data, catalogue: Promise.resolve<BinderCatalogueCard[]>([]) };

	return { ...data, catalogue: cachedJson<BinderCatalogueCard[]>(fetch, '/api/binder') };
};
