import { error, redirect } from '@sveltejs/kit';
import { findCardBySlug, getCardDetails, getCards, getCardVersions, getPokemons, getPrices, getSets } from '#helpers/catalogue-data.ts';
import { CATALOGUES, type LanguagePaths } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import { cardOgVersion, ogImage } from '#helpers/og-image.ts';
import { cardPageData, cardPath, cardPrice, formatCardNumber, pokemonsById, setNeighbourLinks, setPath, setsById } from '#helpers/card-utils.ts';
import { article, breadcrumbs, cardSchema } from '#helpers/seo.ts';
import type { PageServerLoad } from './$types';

/** The English page and the Japanese and French ones share this load. Their wording differs where `english` is tested, and every other line reads the catalogue of `params.card`. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const language = params.card;
	const english = language === 'en';
	const catalogue = CATALOGUES[language];
	const { adjective } = catalogue;
	/** Each catalogue has its own prices and sets. The slug lookup shares the memoized card list, so it loads in parallel with the others. */
	const [found, allCards, prices, pokemons, sets] = await Promise.all([findCardBySlug(language, params.slug), getCards(language), getPrices(language), getPokemons(), getSets(language)]);

	if (!found) {
		throw error(404, 'Card not found');
	}

	if (params.slug !== found.canonical) {
		redirect(301, cardPath(language, found.card));
	}

	const { cardCode } = found.card;
	/** Streamed, not awaited: the language switcher is decorative, so a slow or failed read never holds back or breaks the page. */
	const versions = getCardVersions(language, cardCode).catch((): LanguagePaths => {
		locals.degraded = true;
		return { [language]: cardPath(language, found.card) };
	});
	const card = await getCardDetails(language, cardCode);

	if (!card) {
		throw error(404, 'Card not found');
	}

	const pokemon = card.pokemonNumber && (!english || card.supertype?.toLowerCase() === 'pokémon') ? pokemonsById(pokemons).get(card.pokemonNumber) : undefined;
	const set = setsById(sets).get(card.setId);
	const price = prices[card.cardCode];
	const value = cardPrice(price);

	/**
	 * The title has the set, the printed number and "Price" because people search for a card that way ("Charizard ex 199/165 price", "Dracaufeu-ex 125/197"),
	 * and price sites (PriceCharting, TCGplayer) title their card pages the same.
	 */
	const numbering = card.localId ? ` ${formatCardNumber(card.localId, set?.printedTotal)}` : '';
	const rarity = english ? card.rarity || 'Pokémon' : card.rarity;

	return {
		...cardPageData(language, card, allCards, prices, pokemons, sets),
		/** The same trail the English set page publishes, so a card sits under its set rather than under the unfiltered grid. */
		breadcrumbs: breadcrumbs(
			...(english
				? set ? [{ name: 'Sets', url: catalogue.setsRoute }, { name: set.name, url: setPath(set, catalogue) }] : [{ name: 'Cards', url: catalogue.gridRoute }]
				: [{ name: `${adjective} cards`, url: catalogue.gridRoute }, ...(set ? [{ name: set.name, url: setPath(set, catalogue) }] : [])]),
			{ name: card.name, url: cardPath(language, card) },
		),
		/** Built from the card, so it never follows the request's percent-encoding of the slug. */
		canonical: cardPath(language, card),
		/** The first sentence answers the query alone, since answer engines quote the start of a page far more than the rest. The price comes last because it goes stale first. */
		description: [
			english
				? `${card.name}${numbering} is ${article(rarity)} ${rarity} card from the ${card.setName} Pokémon TCG set`
				: `${card.name}${numbering} is a ${adjective} Pokémon TCG card${rarity ? ` of rarity ${rarity}` : ''} from the ${card.setName} set`,
			card.artist ? `, illustrated by ${card.artist}` : '',
			'.',
			value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
			english && pokemon?.description ? ` ${pokemon.description}` : '',
		].join('').slice(0, 300),
		/** The share image draws the name, scan and price, so those make up its version: a new price is a new preview on Discord or X. */
		image: ogImage(
			{ code: card.cardCode, kind: 'card', language },
			`${card.name} ${english ? '' : `${adjective} `}Pokémon card from ${card.setName}${value ? `, worth ${formatEuros(value)} on Cardmarket` : ''}`,
			...cardOgVersion(card, value),
		),
		keywords: (english
			? [card.name, `${card.name} price`, card.setName, card.rarity, card.artist, 'Pokémon TCG']
			: [card.name, `${card.name} ${adjective.toLowerCase()} card`, card.setName, `${adjective} Pokémon TCG`]
		).filter(Boolean),
		neighbours: setNeighbourLinks(language, card, allCards),
		schemas: [cardSchema(card, price, pokemon, set, catalogue)],
		title: `${card.name}${numbering} - ${card.setName} Price${english ? '' : ` (${adjective})`}`,
		type: 'Product' as const,
		versions,
	};
};
