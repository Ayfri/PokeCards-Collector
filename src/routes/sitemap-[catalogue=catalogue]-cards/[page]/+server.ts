import { error } from '@sveltejs/kit';
import { BY_ROUTE_CODE } from '$helpers/catalogues';
import { getCards } from '$lib/helpers/supabase-data';
import { processCardImage } from '$helpers/card-images';
import { SITEMAP_CHUNK, sitemapResponse, urlset } from '$helpers/sitemap';
import type { RequestHandler } from './$types';

/** A foreign catalogue, chunked the same way as the English one. */
export const GET: RequestHandler = async ({ params }) => {
	const page = Number(params.page);
	if (!Number.isInteger(page) || page < 1) error(404, 'Not found');

	const catalogue = BY_ROUTE_CODE[params.catalogue];
	const cards = await getCards(catalogue.language);
	const slice = cards.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
	if (!slice.length) error(404, 'Not found');

	const lastmod = new Date().toISOString();

	return sitemapResponse(urlset(slice.map(card => ({
		changefreq: 'weekly' as const,
		image: card.image ? { loc: processCardImage(card.image), title: card.name } : undefined,
		lastmod,
		loc: `${catalogue.cardRoute}/${card.cardCode}`,
		priority: 0.4,
	}))));
};
