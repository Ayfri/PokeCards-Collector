import { BY_GRID, CATALOGUES, type Catalogue, type LanguagePaths } from '#helpers/catalogues.ts';
import { setCardCount, setPath } from '#helpers/card-utils.ts';
import { setLanding } from '#helpers/grid-payload.ts';
import { setShareImage } from '#helpers/og-image.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { findSetBySlug, getCards, getPrices, getSetVersions } from '#helpers/supabase-data.ts';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Serves `/sets/x`, `/france/sets/x` and `/japan/sets/x`. The checklist, the facts and the schemas are all rendered here, so the page is a
 * document of its own before any JavaScript runs. It never reads `url.searchParams`: the grid's filters change the query, and a load that
 * reads it would rerun and send the checklist again on every keystroke. The grid's cards come from `/api/set-cards` through `+page.ts`.
 */
export const load: PageServerLoad = async ({ params }) => {
	const catalogue: Catalogue = params.grid ? BY_GRID[params.grid] : CATALOGUES.en;
	const { adjective, language, routeCode } = catalogue;

	const found = await findSetBySlug(language, params.setSlug);
	if (!found) error(404, 'Set not found');
	if (found.canonical !== params.setSlug) redirect(301, setPath(found.set, catalogue));

	const { set } = found;
	const [cards, prices, versions] = await Promise.all([getCards(language), getPrices(language), getSetVersions(language, set).catch((): LanguagePaths => ({}))]);
	const landing = setLanding(set, cards, prices, catalogue);
	const canonical = setPath(set, catalogue);
	const total = setCardCount(set);
	const released = set.releaseDate ? new Date(set.releaseDate).getFullYear() : null;
	const kind = routeCode ? `${adjective} Pokémon TCG` : 'Pokémon TCG';

	return {
		breadcrumbs: breadcrumbs({ name: routeCode ? `${adjective} sets` : 'Sets', url: catalogue.setsRoute }, { name: set.name, url: canonical }),
		canonical,
		catalogueLanguage: language,
		checklist: landing.checklist,
		description: `Every card in the ${kind} set ${set.name}${set.series ? ` of the ${set.series} series` : ''}${released ? `, released in ${released}` : ''}${total ? `, ${total} cards in total` : ''}, with Cardmarket prices in euros.${landing.topCard}`,
		image: setShareImage(set, landing.value, catalogue),
		keywords: [`${set.name} card list`, `${set.name} set`, `${set.name} card prices`, kind],
		note: catalogue.note,
		schemas: landing.schemas,
		set,
		title: `${set.name} Card List & Prices${routeCode ? ` (${adjective})` : ''}`,
		topCards: landing.topCards,
		type: 'CollectionPage' as const,
		value: landing.value,
		versions,
	};
};
