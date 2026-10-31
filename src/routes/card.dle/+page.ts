import { browser } from '$app/env';
import { cachedJson } from '#helpers/cached-json.ts';
import type { CardDleSuggestion } from '../api/card-dle/suggestions/+server';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data, fetch }) => {
	/** The picker only appears once the player types, so the server has nothing to render from the suggestions. */
	if (!browser) return { ...data, suggestions: Promise.resolve<CardDleSuggestion[]>([]) };

	return { ...data, suggestions: cachedJson<CardDleSuggestion[]>(fetch, '/api/card-dle/suggestions') };
};
