import { browser } from '$app/environment';
import type { BinderCatalogueCard } from '$lib/types';
import type { PageLoad } from './$types';

/** Held in module scope so navigating back to the binder reuses the catalogue instead of re-fetching it. */
let cachedCatalogue: Promise<BinderCatalogueCard[]> | null = null;

export const load: PageLoad = ({ data, fetch }) => {
	// The binder is built from localStorage, so the server renders an empty board whatever this returns.
	if (!browser) return { ...data, catalogue: Promise.resolve<BinderCatalogueCard[]>([]) };

	cachedCatalogue ??= fetch('/api/binder').then(response => response.json() as Promise<BinderCatalogueCard[]>);
	return { ...data, catalogue: cachedCatalogue };
};
