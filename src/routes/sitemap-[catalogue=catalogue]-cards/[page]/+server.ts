import { error } from '@sveltejs/kit';
import { BY_ROUTE_CODE } from '#helpers/catalogues.ts';
import { getCards, getTwinPaths } from '#helpers/supabase-data.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { cardPath } from '#helpers/card-utils.ts';
import { SITEMAP_CHUNK, sitemapResponse, twinAlternates, urlset } from '#helpers/sitemap.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const page = Number(params.page);
	if (!Number.isInteger(page) || page < 1) error(404, 'Not found');

	const catalogue = BY_ROUTE_CODE[params.catalogue];
	const { language } = catalogue;
	/** Japanese cards get no alternates: several Japanese prints share one English twin, so the links could not be reciprocal. */
	const [cards, twins] = await Promise.all([getCards(language), language === 'ja' ? undefined : getTwinPaths(language)]);
	const slice = cards.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
	if (!slice.length) error(404, 'Not found');

	return sitemapResponse(urlset(slice.map(card => ({
		alternates: twinAlternates(twins?.get(card.cardCode)),
		changefreq: 'weekly' as const,
		image: card.image ? { loc: processCardImage(card.image), title: card.name } : undefined,
		loc: cardPath(catalogue.language, card),
		priority: 0.4,
	}))));
};
