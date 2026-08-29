import { getJapaneseCards, getJapanesePrices, getPokemons } from '$helpers/supabase-data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { processCardImage } from '$helpers/card-images';
import { breadcrumbs, cardPrice, cardSchema } from '$helpers/seo';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	const { sets, ...layoutData } = await parent();

	// Japanese cards carry their own prices, only the English catalogue is read by `getCards` / `getPrices`.
	const [allJpCards, prices] = await Promise.all([getJapaneseCards(), getJapanesePrices()]);
	
	// Find the specific card
	const card = allJpCards.find(c => c.cardCode === cardCode);
	
	if (!card) {
		throw error(404, 'Card not found');
	}
	
	// Get Pokémon data
	const pokemons = await getPokemons();
	const pokemon = pokemons.find(p => p.id === card.pokemonNumber);
	
	// Get all cards for this Pokémon (if it's a Pokémon card)
	let pokemonCards: FullCard[] = [];
	if (card.pokemonNumber) {
		pokemonCards = allJpCards.filter(c => c.pokemonNumber === card.pokemonNumber);
	}
	
	const price = prices[card.cardCode];
	const value = cardPrice(price);
	const numbering = card.localId ? ` #${card.localId}` : '';

	// `card.image` is a TCGdex base with no extension: handed to a crawler as-is it resolves to nothing.
	const pageSeoData = {
		breadcrumbs: breadcrumbs(
			{ name: 'Japanese cards', url: '/japan' },
			{ name: card.name, url: `/jp-card/${card.cardCode}` },
		),
		description: [
			`${card.name} is a Japanese Pokémon TCG card${card.rarity ? ` of rarity ${card.rarity}` : ''} from the ${card.setName} set`,
			card.artist ? `, illustrated by ${card.artist}` : '',
			'.',
			value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		].join('').slice(0, 300),
		image: {
			alt: `${card.name} Japanese Pokémon card from ${card.setName}`,
			url: card.image ? processCardImage(card.image) : '/favicon.png',
		},
		keywords: [card.name, `${card.name} japanese card`, card.setName, 'Japanese Pokémon TCG'].filter(Boolean),
		schemas: [cardSchema(card, price, pokemon, sets.find(s => s.name === card.setName), '/jp-card')],
		title: `${card.name}${numbering} - ${card.setName} (Japanese)`,
		type: 'Product' as const,
	};
	
	return {
		...layoutData,
		card,
		pokemon,
		allCards: allJpCards, // Pass the fetched Japanese cards
		pokemonCards,
		pokemons,
		sets,    
		prices,
		...pageSeoData
	};
}; 