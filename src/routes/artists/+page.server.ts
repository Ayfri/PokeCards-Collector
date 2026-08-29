import { distinctArtists } from '$helpers/card-grid';
import type { PageServerLoad } from './$types';
import { breadcrumbs } from '$helpers/seo';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const sets = parentData.sets || [];

	const layoutData = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	// Derived from the cards the layout already streamed, instead of a second full scan of `cards`.
	const artists = distinctArtists(allCards);

	const pageSeoData = {
		breadcrumbs: breadcrumbs({ name: 'Artists', url: '/artists' }),
		description: `The ${artists.length} illustrators behind the Pokémon Trading Card Game. Open an artist to see every card they have drawn, with prices and set information.`,
		keywords: ['Pokémon card artists', 'Pokémon TCG illustrators', 'Pokémon card artwork'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: artists.slice(0, 50).map((artist, index) => ({
				'@type': 'ListItem',
				item: { '@type': 'Person', jobTitle: 'Illustrator', name: artist },
				position: index + 1,
			})),
			name: 'Pokémon TCG illustrators',
			numberOfItems: artists.length,
		}],
		title: 'Pokémon TCG Card Artists',
		type: 'CollectionPage' as const,
	};

	return {
		...layoutData,
		allCards,
		artists,
		sets,
		prices,
		...pageSeoData
	};
};
