import type { PageServerLoad } from './$types';
import { breadcrumbs } from '$helpers/seo';

/**
 * SEO only. The catalogue comes from `/api/binder` through `+page.ts`, and the owned card codes come straight from
 * the layout's `collectionItems` / `wishlistItems` - resolving them into whole cards here duplicated rows the
 * document already carried.
 */
export const load: PageServerLoad = async ({ parent }) => ({
	...(await parent()),
	title: 'Pokémon Card Binder Builder',
	description: 'Lay out a digital Pokémon card binder page by page. Pick a grid size, drop in cards from the whole catalogue or from your own collection, and export the result as an image.',
	breadcrumbs: breadcrumbs({ name: 'Binder', url: '/binder' }),
	keywords: ['Pokémon binder builder', 'digital card binder', 'Pokémon card layout', 'binder page maker'],
});
