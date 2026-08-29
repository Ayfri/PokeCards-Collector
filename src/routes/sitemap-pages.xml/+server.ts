import { getJapaneseSets, getSets } from '$lib/helpers/supabase-data';
import { sitemapResponse, urlset, type SitemapEntry } from '$helpers/sitemap';

/** Browsable routes and every set grid. User pages are left out: they are `noindex` unless the profile is public. */
export async function GET() {
	const [sets, jpSets] = await Promise.all([getSets(), getJapaneseSets()]);
	const lastmod = new Date().toISOString();

	const entries: SitemapEntry[] = ([
		{ changefreq: 'daily', loc: '/', priority: 1 },
		{ changefreq: 'daily', loc: '/cards-list', priority: 0.9 },
		{ changefreq: 'weekly', loc: '/sets', priority: 0.9 },
		{ changefreq: 'weekly', loc: '/pokemons', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/japan', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/artists', priority: 0.7 },
		{ changefreq: 'daily', loc: '/card.dle', priority: 0.7 },
		{ changefreq: 'daily', loc: '/guess-the-price', priority: 0.7 },
		{ changefreq: 'monthly', loc: '/binder', priority: 0.6 },
		{ changefreq: 'daily', loc: '/users', priority: 0.5 },
	] satisfies SitemapEntry[]).map(entry => ({ ...entry, lastmod }));

	// A `?set=` grid is a distinct document with its own title, description and schema, so each one is listed.
	for (const set of sets) {
		entries.push({
			changefreq: 'weekly',
			image: set.logo ? { loc: set.logo, title: set.name } : undefined,
			lastmod,
			loc: `/cards-list?set=${encodeURIComponent(set.name)}`,
			priority: 0.8,
		});
	}

	for (const set of jpSets) {
		entries.push({
			changefreq: 'weekly',
			image: set.logo ? { loc: set.logo, title: set.name } : undefined,
			lastmod,
			loc: `/japan?set=${encodeURIComponent(set.name)}`,
			priority: 0.6,
		});
	}

	return sitemapResponse(urlset(entries));
}
