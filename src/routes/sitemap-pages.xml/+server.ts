import { BY_GRID, CATALOGUES } from '#helpers/catalogues.ts';
import { setPath } from '#helpers/card-utils.ts';
import { getSets } from '#helpers/catalogue-data.ts';
import { type SitemapEntry, sitemapResponse, urlset } from '#helpers/sitemap.ts';

/** Browsable routes and every set page. User pages are left out because they are `noindex` unless the profile is public. */
export async function GET() {
	const foreign = Object.values(BY_GRID);
	const [sets, ...foreignSets] = await Promise.all([getSets(), ...foreign.map(({ language }) => getSets(language))]);

	/** No `lastmod`: nothing here has a real modification date, and a "now" timestamp on every URL teaches crawlers to ignore the field. */
	const entries: SitemapEntry[] = [
		{ changefreq: 'daily', loc: '/', priority: 1 },
		{ changefreq: 'daily', loc: '/cards-list', priority: 0.9 },
		{ changefreq: 'weekly', loc: '/sets', priority: 0.9 },
		{ changefreq: 'weekly', loc: '/pokemons', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/trainers', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/japan', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/france', priority: 0.8 },
		{ changefreq: 'weekly', loc: '/france/sets', priority: 0.7 },
		{ changefreq: 'weekly', loc: '/japan/sets', priority: 0.7 },
		{ changefreq: 'weekly', loc: '/artists', priority: 0.7 },
		{ changefreq: 'daily', loc: '/card.dle', priority: 0.7 },
		{ changefreq: 'daily', loc: '/guess-the-price', priority: 0.7 },
		{ changefreq: 'monthly', loc: '/binder', priority: 0.6 },
		{ changefreq: 'daily', loc: '/users', priority: 0.5 },
	];

	/** A set page is a document with its own title, description, checklist and schema, so each one is listed. */
	for (const set of sets) {
		entries.push({
			changefreq: 'weekly',
			image: set.logo ? { loc: set.logo, title: set.name } : undefined,
			loc: setPath(set, CATALOGUES.en),
			priority: 0.8,
		});
	}

	foreign.forEach((catalogue, index) => {
		for (const set of foreignSets[index]) {
			entries.push({
				changefreq: 'weekly',
				image: set.logo ? { loc: set.logo, title: set.name } : undefined,
				loc: setPath(set, catalogue),
				priority: 0.6,
			});
		}
	});

	return sitemapResponse(urlset(entries));
}
