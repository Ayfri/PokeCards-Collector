import { browser } from '$app/environment';
import { cachedJson } from '$helpers/cached-json';
import type { CardDleSuggestion } from '../api/card-dle/suggestions/+server';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data, fetch }) => {
	// The picker only exists once the player types, so the server has nothing to render from it.
	if (!browser) return { ...data, suggestions: Promise.resolve<CardDleSuggestion[]>([]) };

	return { ...data, suggestions: cachedJson<CardDleSuggestion[]>(fetch, '/api/card-dle/suggestions') };
};
