import { BASE_URL } from '#src/constants.ts';

export interface SitemapEntry {
	/** Rendered as `xhtml:link` hreflang alternates. Google needs them reciprocal and self-referencing, so each page of a group lists the whole group. */
	alternates?: { href: string; hreflang: string }[];
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	/** Rendered as an `image:image` entry, which is what puts card art into Google Images. */
	image?: { loc: string; title?: string };
	lastmod?: string;
	loc: string;
	priority?: number;
}

function absolute(url: string): string {
	return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

/** URLs and titles carry `&`, `'` and accented set names, and an unescaped one makes the whole file unparseable. */
function xmlEscape(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Sitemaps are capped at 50 000 URLs each; cards are chunked well below that so a file stays quick to fetch. */
export const SITEMAP_CHUNK = 20_000;

export function sitemapResponse(body: string, maxAge = 3600): Response {
	return new Response(body, {
		headers: {
			'cache-control': `public, max-age=${maxAge}, stale-while-revalidate=86400`,
			'content-type': 'application/xml; charset=utf-8',
		},
	});
}

/** The English and French pages of one card, as the alternates both entries carry. */
export function twinAlternates(twin: Record<'en' | 'fr', string> | undefined): SitemapEntry['alternates'] {
	return twin && [{ href: twin.en, hreflang: 'en' }, { href: twin.fr, hreflang: 'fr' }];
}

export function urlset(entries: SitemapEntry[]): string {
	const body = entries.map(entry => {
		return [
			'\t<url>',
			`\t\t<loc>${xmlEscape(absolute(entry.loc))}</loc>`,
			...(entry.alternates ?? []).map(alternate => `\t\t<xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(absolute(alternate.href))}"/>`),
			entry.lastmod ? `\t\t<lastmod>${entry.lastmod}</lastmod>` : '',
			entry.changefreq ? `\t\t<changefreq>${entry.changefreq}</changefreq>` : '',
			entry.priority !== undefined ? `\t\t<priority>${entry.priority.toFixed(1)}</priority>` : '',
			entry.image
				? `\t\t<image:image><image:loc>${xmlEscape(absolute(entry.image.loc))}</image:loc>${entry.image.title ? `<image:title>${xmlEscape(entry.image.title)}</image:title>` : ''}</image:image>`
				: '',
			'\t</url>',
		].filter(Boolean).join('\n');
	}).join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;
}

export function sitemapIndex(locations: { lastmod?: string; loc: string }[]): string {
	const body = locations.map(entry => [
		'\t<sitemap>',
		`\t\t<loc>${xmlEscape(absolute(entry.loc))}</loc>`,
		entry.lastmod ? `\t\t<lastmod>${entry.lastmod}</lastmod>` : '',
		'\t</sitemap>',
	].filter(Boolean).join('\n')).join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}
