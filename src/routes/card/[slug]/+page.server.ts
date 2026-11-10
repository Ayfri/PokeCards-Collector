import { error, redirect } from '@sveltejs/kit';
import { findCardBySlug, getCardDetails, getCards, getCardVersions, getPokemons, getPrices, getSets } from '#helpers/supabase-data.ts';
import { CATALOGUES, type CardVersions } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import { cardOgVersion, ogImage } from '#helpers/og-image.ts';
import { cardPageData, cardPath, cardPrice, formatCardNumber, setNeighbourLinks, setPath, setsById } from '#helpers/card-utils.ts';
import { article, breadcrumbs, cardSchema } from '#helpers/seo.ts';
import type { Pokemon } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	/** Started together so the slug lookup, the sibling cards, the prices and the sets load in parallel; the slug lookup shares the memoized card list. */
	const [found, allCards, prices, allPokemons, sets] = await Promise.all([findCardBySlug('en', params.slug), getCards(), getPrices(), getPokemons(), getSets()]);

	if (!found) {
		throw error(404, 'Card not found');
	}

	if (params.slug !== found.canonical) {
		redirect(301, cardPath('en', found.card));
	}

	const { cardCode } = found.card;
	/** Streamed, not awaited: the language switcher is decorative, so a slow or failed read never holds back or breaks the page. */
	const versions = getCardVersions('en', cardCode).catch((): CardVersions => ({ en: cardPath('en', found.card) }));
	const targetCard = await getCardDetails('en', cardCode);

	if (!targetCard) {
		throw error(404, 'Card not found');
	}

	let associatedPokemon: Pokemon | undefined;
	if (targetCard.supertype?.toLowerCase() === 'pokémon' && targetCard.pokemonNumber) {
		associatedPokemon = allPokemons.find(p => p.id === targetCard.pokemonNumber);
	}

	const set = setsById(sets).get(targetCard.setId);
	const price = prices[targetCard.cardCode];
	const value = cardPrice(price);

	/**
	 * The title has the set, the printed number and "Price" because people search for a card that way ("Charizard ex 199/165 price"),
	 * and price sites (PriceCharting, TCGplayer) title their card pages the same.
	 */
	const numbering = targetCard.localId ? ` ${formatCardNumber(targetCard.localId, set?.printedTotal)}` : '';
	const pageTitle = `${targetCard.name}${numbering} - ${targetCard.setName} Price`;

	/** The first sentence answers the query alone, since answer engines quote the start of a page far more than the rest. The price comes last because it goes stale first. */
	const pageDescription = [
		`${targetCard.name}${numbering} is ${article(targetCard.rarity || 'Pokémon')} ${targetCard.rarity || 'Pokémon'} card from the ${targetCard.setName} Pokémon TCG set`,
		targetCard.artist ? `, illustrated by ${targetCard.artist}` : '',
		'.',
		value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		associatedPokemon?.description ? ` ${associatedPokemon.description}` : '',
	].join('').slice(0, 300);

	/** The share image draws the name, scan and price, so those make up its version: a new price is a new preview on Discord or X. */
	const pageImage = ogImage(
		{ code: targetCard.cardCode, kind: 'card', language: 'en' },
		`${targetCard.name} Pokémon card from ${targetCard.setName}${value ? `, worth ${formatEuros(value)} on Cardmarket` : ''}`,
		...cardOgVersion(targetCard, value),
	);

	/** The same trail the set page publishes, so a card sits under its set rather than under the unfiltered grid. */
	const pageBreadcrumbs = breadcrumbs(
		...(set ? [{ name: 'Sets', url: '/sets' }, { name: set.name, url: setPath(set, CATALOGUES.en) }] : [{ name: 'Cards', url: '/cards-list' }]),
		{ name: targetCard.name, url: cardPath('en', targetCard) },
	);

	return {
		...cardPageData('en', targetCard, allCards, prices, allPokemons, sets),
		/** Built from the card, so it never follows the request's percent-encoding of the slug. */
		canonical: cardPath('en', targetCard),
		neighbours: setNeighbourLinks('en', targetCard, allCards),
		versions,
		title: pageTitle,
		description: pageDescription,
		image: pageImage,
		breadcrumbs: pageBreadcrumbs,
		keywords: [targetCard.name, `${targetCard.name} price`, targetCard.setName, targetCard.rarity, targetCard.artist, 'Pokémon TCG'].filter(Boolean),
		schemas: [cardSchema(targetCard, price, associatedPokemon, set)],
		type: 'Product' as const,
	};
};
