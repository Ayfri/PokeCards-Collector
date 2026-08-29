import { getCards, getJapaneseCards } from '$lib/helpers/supabase-data';
import { SITEMAP_CHUNK, sitemapIndex, sitemapResponse } from '$helpers/sitemap';

/**
 * The catalogue is far past the point where one file is reasonable, so this is the index and the card lists are
 * chunked children. `robots.txt` and the `rel="sitemap"` link both point here, and Search Console only needs this URL.
 */
export async function GET() {
	const [cards, jpCards] = await Promise.all([getCards(), getJapaneseCards()]);
	const lastmod = new Date().toISOString();

	const chunks = (total: number, path: string) =>
		Array.from({ length: Math.max(1, Math.ceil(total / SITEMAP_CHUNK)) }, (_, index) => ({
			lastmod,
			loc: `${path}/${index + 1}`,
		}));

	return sitemapResponse(sitemapIndex([
		{ lastmod, loc: '/sitemap-pages.xml' },
		...chunks(cards.length, '/sitemap-cards'),
		...chunks(jpCards.length, '/sitemap-jp-cards'),
	]));
}
