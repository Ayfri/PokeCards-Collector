import { error } from '@sveltejs/kit';
import { getCards, getTwinPaths } from '#helpers/supabase-data.ts';
import { processCardImage } from '#helpers/card-images.ts';
import { cardPath } from '#helpers/card-utils.ts';
import { SITEMAP_CHUNK, sitemapResponse, twinAlternates, urlset } from '#helpers/sitemap.ts';
import type { RequestHandler } from './$types';

/** One chunk of card URLs, each with its scan so the art can appear in Google Images. */
export const GET: RequestHandler = async ({ params }) => {
	const page = Number(params.page);
	if (!Number.isInteger(page) || page < 1) error(404, 'Not found');

	const [cards, twins] = await Promise.all([getCards(), getTwinPaths('en')]);
	const slice = cards.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
	if (!slice.length) error(404, 'Not found');

	/** No `lastmod`: cards have no per-card date, and a "now" timestamp on every URL teaches crawlers to ignore the field. */
	return sitemapResponse(urlset(slice.map(card => ({
		alternates: twinAlternates(twins.get(card.cardCode)),
		changefreq: 'weekly' as const,
		image: card.image ? { loc: processCardImage(card.image), title: card.name } : undefined,
		loc: cardPath('en', card),
		priority: 0.6,
	}))));
};
