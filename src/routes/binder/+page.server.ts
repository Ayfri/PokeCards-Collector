import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { breadcrumbs } from '#helpers/seo.ts';

/**
 * SEO only. The catalogue and its sets come from `/api/binder` through `+page.ts`, and the owned card codes come straight from
 * the layout's `collectionCodes` / `wishlistCodes`: resolving them into whole cards here would duplicate rows the
 * document already carries.
 */
export const load: PageServerLoad = () => ({
	breadcrumbs: breadcrumbs({ name: 'Binder', url: '/binder' }),
	description: 'Lay out a digital Pokémon card binder page by page. Pick a grid size, drop in cards from the whole catalogue or from your own collection, and export the result as an image.',
	image: ogImage({ kind: 'page', name: 'binder' }, 'The PokéCards-Collector binder builder, with three of the most valuable cards'),
	keywords: ['Pokémon binder builder', 'digital card binder', 'Pokémon card layout', 'binder page maker'],
	title: 'Pokémon Card Binder Builder',
});
