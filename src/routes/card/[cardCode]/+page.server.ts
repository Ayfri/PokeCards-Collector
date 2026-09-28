import { error } from '@sveltejs/kit';
import { getCards, getPokemons, getPrices } from '$helpers/supabase-data';
import { processCardImage } from '$helpers/card-images';
import { cardPageCatalogue, cardPrice } from '$helpers/card-utils';
import { article, breadcrumbs, cardSchema } from '$helpers/seo';
import type { FullCard, Pokemon } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	// Started before `parent()` so the catalogue reads overlap the layout's auth and collection queries.
	const catalogue = Promise.all([getCards(), getPrices(), getPokemons()]);
	const parentData = await parent();
	const [allCards, prices, allPokemons] = await catalogue;
	const sets = parentData.sets || [];

	const targetCard = allCards.find(c => c.cardCode === cardCode);
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

	if (relevantCards.length === 0 && targetCard) {
		relevantCards = [targetCard];
	}

	relevantCards.sort((a, b) => (cardPrice(prices[b.cardCode]) ?? 0) - (cardPrice(prices[a.cardCode]) ?? 0));

	if (targetCard && relevantCards.length > 0 && relevantCards[0].cardCode !== cardCode) {
		const targetIndex = relevantCards.findIndex(c => c.cardCode === cardCode);
		if (targetIndex > 0) {
			const cardToMove = relevantCards.splice(targetIndex, 1)[0];
			relevantCards.unshift(cardToMove);
		}
	}

	const set = sets.find(s => s.name === targetCard.setName);
	const price = prices[targetCard.cardCode];
	const value = cardPrice(price);

	// The title carries the set and the card number because that is how a card is searched for: "Charizard ex 199/165".
	const numbering = targetCard.localId ? ` #${targetCard.localId}` : '';
	const pageTitle = `${targetCard.name}${numbering} - ${targetCard.setName}`;

	// The first sentence answers the query on its own, since answer engines quote the opening of a page far more
	// often than the rest of it. The price comes last because it is the part that goes stale.
	const pageDescription = [
		`${targetCard.name} is ${article(targetCard.rarity || 'Pokémon')} ${targetCard.rarity || 'Pokémon'} card from the ${targetCard.setName} Pokémon TCG set`,
		targetCard.artist ? `, illustrated by ${targetCard.artist}` : '',
		'.',
		value ? ` It trades around €${value.toFixed(2)} on Cardmarket.` : '',
		associatedPokemon?.description ? ` ${associatedPokemon.description}` : '',
	].join('').slice(0, 300);

	// `targetCard.image` is a TCGdex base with no extension, which no crawler can fetch as an `og:image`.
	const pageImage = {
		alt: `${targetCard.name} Pokémon card from ${targetCard.setName}`,
		url: targetCard.image ? processCardImage(targetCard.image) : parentData.image?.url || '',
	};

	const pageBreadcrumbs = breadcrumbs(
		{ name: 'Cards', url: '/cards-list' },
		...(targetCard.setName ? [{ name: targetCard.setName, url: `/cards-list?set=${encodeURIComponent(targetCard.setName)}` }] : []),
		{ name: targetCard.name, url: `/card/${targetCard.cardCode}` },
	);

	// The layout already ships `sets`, and the page only reads the cards, Pokémon and prices around this one.
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
