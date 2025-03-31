import { getCards } from '$lib/helpers/data';
import { BASE_URL } from '~/constants';
export async function GET() {
	const cards = await getCards();

	const mainPage = `${BASE_URL}/`;

	return new Response(
		`
		<?xml version="1.0" encoding="UTF-8" ?>
		<urlset
			xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
			xmlns:xhtml="https://www.w3.org/1999/xhtml"
			xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
			xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
			xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
			xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
		>
			<url>
				<loc>${mainPage}</loc>
				<lastmod>${new Date().toISOString()}</lastmod>
				<changefreq>weekly</changefreq>
				<priority>1</priority>
			</url>
			${cards.map(card => `<url>
				<loc>${`${BASE_URL}/card/${card.pokemon.id}`}</loc>
				<lastmod>${new Date().toISOString()}</lastmod>
				<changefreq>weekly</changefreq>
				<priority>0.8</priority>
			</url>`).join('\n')}
		</urlset>`.trim(),
		{
			headers: {
				'Content-Type': 'application/xml',
			},
		},
	);
}
