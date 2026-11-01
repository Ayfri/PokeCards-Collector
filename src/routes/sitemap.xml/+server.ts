import { BY_ROUTE_CODE } from '#helpers/catalogues.ts';
import { countCards } from '#helpers/supabase-data.ts';
import { SITEMAP_CHUNK, sitemapIndex, sitemapResponse } from '#helpers/sitemap.ts';

/**
 * The catalogue is too big for one sitemap file, so this is an index and the card lists are chunked child sitemaps.
 * `robots.txt` and the `rel="sitemap"` link both point here, and Search Console only needs this URL.
 */
export async function GET() {
	const foreign = Object.entries(BY_ROUTE_CODE);
	const [englishCount, ...foreignCounts] = await Promise.all([countCards('en'), ...foreign.map(([, { language }]) => countCards(language))]);

	const chunks = (total: number, path: string) =>
		Array.from({ length: Math.max(1, Math.ceil(total / SITEMAP_CHUNK)) }, (_, index) => ({
			loc: `${path}/${index + 1}`,
		}));

	return sitemapResponse(sitemapIndex([
		{ loc: '/sitemap-pages.xml' },
		...chunks(englishCount,'/sitemap-cards'),
		...foreign.flatMap(([routeCode], index) => chunks(foreignCounts[index], `/sitemap-${routeCode}-cards`)),
	]));
}
