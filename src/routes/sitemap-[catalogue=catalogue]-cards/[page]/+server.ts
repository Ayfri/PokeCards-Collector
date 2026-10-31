import { error } from '@sveltejs/kit';
import { BY_ROUTE_CODE } from '#helpers/catalogues.ts';
import { getCards } from '#helpers/supabase-data.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { SITEMAP_CHUNK, sitemapResponse, urlset } from '#helpers/sitemap.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const page = Number(params.page);
	if (!Number.isInteger(page) || page < 1) error(404, 'Not found');

	const catalogue = BY_ROUTE_CODE[params.catalogue];
	const cards = await getCards(catalogue.language);
	const slice = cards.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
	if (!slice.length) error(404, 'Not found');

	return sitemapResponse(urlset(slice.map(card => ({
		changefreq: 'weekly' as const,
		image: card.image ? { loc: processCardImage(card.image), title: card.name } : undefined,
		loc: `${catalogue.cardRoute}/${card.cardCode}`,
		priority: 0.4,
	}))));
};
