import { BY_ROUTE_CODE, type CardVersions } from '#helpers/catalogues.ts';
import { getCardDetails, getCards, getCardVersions, getPokemons, getPrices, getSets } from '#helpers/supabase-data.ts';
import type { FullCard } from '#lib/types.js';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { processCardImage } from '#helpers/card-images.ts';
import { cardPageCatalogue, cardPrice } from '#helpers/card-utils.ts';
import { breadcrumbs, cardSchema } from '#helpers/seo.ts';

export const load: PageServerLoad = async ({ params }) => {
	const { cardCode } = params;
	const catalogue = BY_ROUTE_CODE[params.catalogue];
	const { adjective, language } = catalogue;
	/** Each catalogue has its own prices and sets; only the English ones come from the layout. */
	const reads = Promise.all([getCardDetails(language, cardCode), getCards(language), getPrices(language), getPokemons(), getSets(language)]);
	/** Streamed, not awaited: the language switcher is decorative, so a slow or failed read never holds back or breaks the page. */
	const versions = getCardVersions(language, cardCode).catch((): CardVersions => ({ [language]: cardCode }));
	const [card, allCards, prices, pokemons, sets] = await reads;

	if (!card) {
		throw error(404, 'Card not found');
	}

	const pokemon = pokemons.find(p => p.id === card.pokemonNumber);

	/** Every print of the same Pokémon, or of the same name for a Trainer or Energy, with this card first. */
	const siblings = allCards.filter(c => c.cardCode !== cardCode && (card.pokemonNumber ? c.pokemonNumber === card.pokemonNumber : c.name === card.name));
	const pokemonCards: FullCard[] = [card, ...siblings];

	const price = prices[card.cardCode];
	const value = cardPrice(price);
	const numbering = card.localId ? ` #${card.localId}` : '';

	/** `card.image` is a TCGdex base URL with no extension, so it is run through `processCardImage` to give crawlers a real file. */
	const pageSeoData = {
		breadcrumbs: breadcrumbs(
			{ name: `${adjective} cards`, url: catalogue.gridRoute },
			{ name: card.name, url: `${catalogue.cardRoute}/${card.cardCode}` },
		),
		description: [
			`${card.name} is a ${adjective} Pokémon TCG card${card.rarity ? ` of rarity ${card.rarity}` : ''} from the ${card.setName} set`,
			card.artist ? `, illustrated by ${card.artist}` : '',
			'.',
			value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		].join('').slice(0, 300),
		image: {
			alt: `${card.name} ${adjective} Pokémon card from ${card.setName}`,
			url: card.image ? processCardImage(card.image) : '/favicon.png',
		},
		keywords: [card.name, `${card.name} ${adjective.toLowerCase()} card`, card.setName, `${adjective} Pokémon TCG`].filter(Boolean),
		schemas: [cardSchema(card, price, pokemon, sets.find(s => s.setId === card.setId), catalogue)],
		title: `${card.name}${numbering} - ${card.setName} (${adjective})`,
		type: 'Product' as const,
	};

	/** The layout returns the English `sets`; this page overrides them with the catalogue's own list. */
	return {
		...cardPageCatalogue(card.pokemonNumber, pokemonCards, allCards, pokemons, prices),
		card,
		pokemon,
		pokemonCards,
		sets,
		versions,
		...pageSeoData
	};
};
