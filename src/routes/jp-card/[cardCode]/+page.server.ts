import { getCardDetails, getJapaneseCards, getJapanesePrices, getJapaneseSets, getPokemons } from '$helpers/supabase-data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { processCardImage } from '$helpers/card-images';
import { cardPageCatalogue, cardPrice } from '$helpers/card-utils';
import { breadcrumbs, cardSchema } from '$helpers/seo';

export const load: PageServerLoad = async ({ params }) => {
	const { cardCode } = params;
	// Japanese cards carry their own prices, only the English catalogue is read by `getCards` / `getPrices`.
	// The layout's `sets` are the English ones; this page swaps in the Japanese list.
	const [card, allJpCards, prices, pokemons, sets] = await Promise.all([getCardDetails('jp_cards', cardCode), getJapaneseCards(), getJapanesePrices(), getPokemons(), getJapaneseSets()]);

	if (!card) {
		throw error(404, 'Card not found');
	}

	const pokemon = pokemons.find(p => p.id === card.pokemonNumber);
	
	// Every print of the same Pokémon, or of the same name for a Trainer or Energy, with this card first.
	const siblings = allJpCards.filter(c => c.cardCode !== cardCode && (card.pokemonNumber ? c.pokemonNumber === card.pokemonNumber : c.name === card.name));
	const pokemonCards: FullCard[] = [card, ...siblings];
	
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
		schemas: [cardSchema(card, price, pokemon, sets.find(s => s.setId === card.setId), '/jp-card')],
		title: `${card.name}${numbering} - ${card.setName} (Japanese)`,
		type: 'Product' as const,
	};
	
	// The layout already ships `sets`, and the page only reads the cards, Pokémon and prices around this one.
	return {
		...cardPageCatalogue(card.pokemonNumber, pokemonCards, allJpCards, pokemons, prices),
		card,
		pokemon,
		pokemonCards,
		sets,
		...pageSeoData
	};
}; 