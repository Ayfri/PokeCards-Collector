import { error } from '@sveltejs/kit';
import { getPokemons } from '$helpers/supabase-data';
import type { FullCard, Pokemon } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	const parentData = await parent();

	const [streamedCards, streamedPrices, allPokemons] = await Promise.all([
		parentData.streamed.allCards,
		parentData.streamed.prices,
		getPokemons(),
	]);
	const allCards = streamedCards || [];
	const prices = streamedPrices || {};
	const sets = parentData.sets || [];

	const layoutPropertiesFromParent = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title,
		description: parentData.description,
		image: parentData.image,
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

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

	relevantCards.sort((a, b) => (prices[b.cardCode]?.simple ?? prices[b.cardCode]?.trend ?? 0) -
	                           (prices[a.cardCode]?.simple ?? prices[a.cardCode]?.trend ?? 0));

	if (targetCard && relevantCards.length > 0 && relevantCards[0].cardCode !== cardCode) {
		const targetIndex = relevantCards.findIndex(c => c.cardCode === cardCode);
		if (targetIndex > 0) {
			const cardToMove = relevantCards.splice(targetIndex, 1)[0];
			relevantCards.unshift(cardToMove);
		}
	}

	const pageTitle = associatedPokemon
		? associatedPokemon.name.charAt(0).toUpperCase() + associatedPokemon.name.slice(1)
		: targetCard.name;

	const pageDescription = associatedPokemon
		? `${pageTitle} - ${associatedPokemon.description || 'Pokémon Card'}`
		: `Card details for ${targetCard.name}`;

	const pageImage = {
		url: targetCard.image || layoutPropertiesFromParent.image?.url || '',
		alt: pageTitle
	};

	return {
		...layoutPropertiesFromParent,
		allCards,
		sets,
		prices,
		pokemon: associatedPokemon,
		pokemonCards: relevantCards,
		targetCard,
		title: pageTitle,
		description: pageDescription,
		image: pageImage,
		pokemons: allPokemons,
	};
};
