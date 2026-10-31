import { error } from '@sveltejs/kit';
import { getCardDetails, getCards, getPokemons, getPrices } from '$helpers/supabase-data';
import { processCardImage } from '$helpers/card-images';
import { cardPageCatalogue, cardPrice } from '$helpers/card-utils';
import { article, breadcrumbs, cardSchema } from '$helpers/seo';
import type { FullCard, Pokemon } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	/** Started before `parent()` so the catalogue reads run in parallel with the layout's auth and collection queries. */
	const catalogue = Promise.all([getCardDetails('en', cardCode), getCards(), getPrices(), getPokemons()]);
	const parentData = await parent();
	const [targetCard, allCards, prices, allPokemons] = await catalogue;
	const sets = parentData.sets || [];

	if (!targetCard) {
		throw error(404, `Card with code ${cardCode} not found`);
	}

	let associatedPokemon: Pokemon | undefined;
	if (targetCard.supertype?.toLowerCase() === 'pokémon' && targetCard.pokemonNumber) {
		associatedPokemon = allPokemons.find(p => p.id === targetCard.pokemonNumber);
	}

	/** Sibling cards: every print of the same Pokémon, or of the same trainer/energy name when the card has no dex number. */
	let relevantCards: FullCard[] = [];

	if (associatedPokemon) {
		relevantCards = allCards.filter(c => c.pokemonNumber === associatedPokemon?.id && c.setName);
	} else {
		const normalizedTargetName = targetCard.name.toLowerCase();
		relevantCards = allCards.filter(c =>
			c.name.toLowerCase() === normalizedTargetName && c.setName
		);
	}

	relevantCards.sort((a, b) => (cardPrice(prices[b.cardCode]) ?? 0) - (cardPrice(prices[a.cardCode]) ?? 0));
	relevantCards = [targetCard, ...relevantCards.filter(c => c.cardCode !== cardCode)];

	const set = sets.find(s => s.setId === targetCard.setId);
	const price = prices[targetCard.cardCode];
	const value = cardPrice(price);

	/** The title has the set and card number because people search for a card that way: "Charizard ex 199/165". */
	const numbering = targetCard.localId ? ` #${targetCard.localId}` : '';
	const pageTitle = `${targetCard.name}${numbering} - ${targetCard.setName}`;

	/** The first sentence answers the query alone, since answer engines quote the start of a page far more than the rest. The price comes last because it goes stale first. */
	const pageDescription = [
		`${targetCard.name} is ${article(targetCard.rarity || 'Pokémon')} ${targetCard.rarity || 'Pokémon'} card from the ${targetCard.setName} Pokémon TCG set`,
		targetCard.artist ? `, illustrated by ${targetCard.artist}` : '',
		'.',
		value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		associatedPokemon?.description ? ` ${associatedPokemon.description}` : '',
	].join('').slice(0, 300);

	/** `targetCard.image` is a TCGdex base URL with no extension, which crawlers cannot fetch as an `og:image`, so it goes through `processCardImage`. */
	const pageImage = {
		alt: `${targetCard.name} Pokémon card from ${targetCard.setName}`,
		url: targetCard.image ? processCardImage(targetCard.image) : parentData.image?.url || '',
	};

	const pageBreadcrumbs = breadcrumbs(
		{ name: 'Cards', url: '/cards-list' },
		...(targetCard.setName ? [{ name: targetCard.setName, url: `/cards-list?set=${encodeURIComponent(targetCard.setName)}` }] : []),
		{ name: targetCard.name, url: `/card/${targetCard.cardCode}` },
	);

	/** The layout already returns `sets`, and the page only needs the cards, Pokémon and prices around this one. */
	return {
		...cardPageCatalogue(targetCard.pokemonNumber, relevantCards, allCards, allPokemons, prices),
		pokemon: associatedPokemon,
		pokemonCards: relevantCards,
		targetCard,
		title: pageTitle,
		description: pageDescription,
		image: pageImage,
		breadcrumbs: pageBreadcrumbs,
		keywords: [targetCard.name, `${targetCard.name} price`, targetCard.setName, targetCard.rarity, targetCard.artist, 'Pokémon TCG'].filter(Boolean),
		schemas: [cardSchema(targetCard, price, associatedPokemon, set)],
		type: 'Product' as const,
	};
};
