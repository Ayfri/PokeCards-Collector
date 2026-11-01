import { BY_ROUTE_CODE, type CardVersions } from '#helpers/catalogues.ts';
import { findCardBySlug, getCardDetails, getCards, getCardVersions, getPokemons, getPrices, getSets } from '#helpers/supabase-data.ts';
import type { FullCard } from '#lib/types.js';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { formatEuros } from '#helpers/format.ts';
import { cardOgVersion, ogImage } from '#helpers/og-image.ts';
import { cardGroupKey, cardPageCatalogue, cardPath, cardPrice, formatCardNumber, setNeighbourLinks, setPath } from '#helpers/card-utils.ts';
import { breadcrumbs, cardSchema } from '#helpers/seo.ts';

export const load: PageServerLoad = async ({ params }) => {
	const catalogue = BY_ROUTE_CODE[params.catalogue];
	const { adjective, language } = catalogue;
	/** Each catalogue has its own prices and sets; only the English ones come from the layout. The slug lookup shares the memoized card list. */
	const [found, allCards, prices, pokemons, sets] = await Promise.all([findCardBySlug(language, params.slug), getCards(language), getPrices(language), getPokemons(), getSets(language)]);

	if (!found) {
		throw error(404, 'Card not found');
	}

	if (params.slug !== found.canonical) {
		redirect(301, cardPath(language, found.card));
	}

	const { cardCode } = found.card;
	/** Streamed, not awaited: the language switcher is decorative, so a slow or failed read never holds back or breaks the page. */
	const versions = getCardVersions(language, cardCode).catch((): CardVersions => ({ [language]: cardPath(language, found.card) }));
	const card = await getCardDetails(language, cardCode);

	if (!card) {
		throw error(404, 'Card not found');
	}

	const pokemon = pokemons.find(p => p.id === card.pokemonNumber);

	/** Every print of the same Pokémon, or of the same Trainer/Energy group (see `cardGroupKey`), with this card first. */
	const key = cardGroupKey(card);
	const siblings = allCards.filter(c => c.cardCode !== cardCode && cardGroupKey(c) === key);
	const pokemonCards: FullCard[] = [card, ...siblings];

	const price = prices[card.cardCode];
	const value = cardPrice(price);
	const set = sets.find(s => s.setId === card.setId);
	/** The printed number, as on the English page: "Dracaufeu-ex 125/197" is how a card is searched. */
	const numbering = card.localId ? ` ${formatCardNumber(card.localId, set?.printedTotal)}` : '';

	/** The share image draws the name, scan and price, so those make up its version: a new price is a new preview on Discord or X. */
	const pageSeoData = {
		breadcrumbs: breadcrumbs(
			{ name: `${adjective} cards`, url: catalogue.gridRoute },
			...(set ? [{ name: set.name, url: setPath(set, catalogue) }] : []),
			{ name: card.name, url: cardPath(language, card) },
		),
		description: [
			`${card.name}${numbering} is a ${adjective} Pokémon TCG card${card.rarity ? ` of rarity ${card.rarity}` : ''} from the ${card.setName} set`,
			card.artist ? `, illustrated by ${card.artist}` : '',
			'.',
			value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		].join('').slice(0, 300),
		image: ogImage(
			{ code: card.cardCode, kind: 'card', language },
			`${card.name} ${adjective} Pokémon card from ${card.setName}${value ? `, worth ${formatEuros(value)} on Cardmarket` : ''}`,
			...cardOgVersion(card, value),
		),
		keywords: [card.name, `${card.name} ${adjective.toLowerCase()} card`, card.setName, `${adjective} Pokémon TCG`].filter(Boolean),
		schemas: [cardSchema(card, price, pokemon, set, catalogue)],
		title: `${card.name}${numbering} - ${card.setName} Price (${adjective})`,
		type: 'Product' as const,
	};

	/** The layout returns the English `sets`; this page overrides them with the catalogue's own list. */
	return {
		...cardPageCatalogue(card.pokemonNumber, pokemonCards, allCards, pokemons, prices),
		card,
		/** Built from the card, so it never follows the request's percent-encoding of the slug. */
		canonical: cardPath(language, card),
		neighbours: setNeighbourLinks(language, card, allCards),
		pokemon,
		pokemonCards,
		sets,
		versions,
		...pageSeoData
	};
};
