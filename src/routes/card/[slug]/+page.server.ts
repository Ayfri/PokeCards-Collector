import { error, redirect } from '@sveltejs/kit';
import { findCardBySlug, getCardDetails, getCards, getCardVersions, getPokemons, getPrices } from '#helpers/supabase-data.ts';
import { CATALOGUES, type CardVersions } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import { cardOgVersion, ogImage } from '#helpers/og-image.ts';
import { cardGroupKey, cardPageCatalogue, cardPath, cardPrice, formatCardNumber, setNeighbourLinks, setPath } from '#helpers/card-utils.ts';
import { article, breadcrumbs, cardSchema } from '#helpers/seo.ts';
import type { FullCard, Pokemon } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	/** Started together so the slug lookup, the sibling cards and the prices load in parallel; the slug lookup shares the memoized card list. */
	const [found, allCards, prices, allPokemons] = await Promise.all([findCardBySlug('en', params.slug), getCards(), getPrices(), getPokemons()]);

	if (!found) {
		throw error(404, 'Card not found');
	}

	if (params.slug !== found.canonical) {
		redirect(301, cardPath('en', found.card));
	}

	const { cardCode } = found.card;
	/** Started before `parent()` so the card row and the versions run in parallel with the layout's auth and collection queries. */
	const details = getCardDetails('en', cardCode);
	/** If `parent()` throws, `details` is never awaited and its rejection would go unhandled; the later `await` still throws it. */
	details.catch(() => undefined);
	/** Streamed, not awaited: the language switcher is decorative, so a slow or failed read never holds back or breaks the page. */
	const versions = getCardVersions('en', cardCode).catch((): CardVersions => ({ en: cardPath('en', found.card) }));
	const parentData = await parent();
	const targetCard = await details;
	const sets = parentData.sets || [];

	if (!targetCard) {
		throw error(404, 'Card not found');
	}

	let associatedPokemon: Pokemon | undefined;
	if (targetCard.supertype?.toLowerCase() === 'pokémon' && targetCard.pokemonNumber) {
		associatedPokemon = allPokemons.find(p => p.id === targetCard.pokemonNumber);
	}

	/** Sibling cards: every print of the same Pokémon, or of the same Trainer/Energy group (supertype and name, see `cardGroupKey`). */
	const groupKey = cardGroupKey(targetCard);
	let relevantCards: FullCard[] = allCards.filter(c => c.setName && cardGroupKey(c) === groupKey);

	relevantCards.sort((a, b) => (cardPrice(prices[b.cardCode]) ?? 0) - (cardPrice(prices[a.cardCode]) ?? 0));
	relevantCards = [targetCard, ...relevantCards.filter(c => c.cardCode !== cardCode)];

	const set = sets.find(s => s.setId === targetCard.setId);
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

	/** The layout already returns `sets`, and the page only needs the cards, Pokémon and prices around this one. */
	return {
		...cardPageCatalogue(targetCard.pokemonNumber, relevantCards, allCards, allPokemons, prices),
		/** Built from the card, so it never follows the request's percent-encoding of the slug. */
		canonical: cardPath('en', targetCard),
		neighbours: setNeighbourLinks('en', targetCard, allCards),
		pokemon: associatedPokemon,
		pokemonCards: relevantCards,
		targetCard,
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
