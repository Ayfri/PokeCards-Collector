import { getCards, getPokemons } from '$helpers/data';
import type { Pokemon, FullCard } from '~/types';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const pokemons = await getPokemons();
	let allCards = await getCards();

	allCards = allCards.sort((a: FullCard, b: FullCard) => a.pokemon.id - b.pokemon.id || (b.price ?? 0) - (a.price ?? 0));
	allCards = allCards.filter((card: FullCard, index: number, self: FullCard[]) =>
		self.findIndex((c: FullCard) => c.image === card.image) === index
	);
	allCards = allCards.filter((card: FullCard) => card.set);

	const pokemon = pokemons.find((p: Pokemon) => p.id === parseInt(params.numero));

	if (!pokemon) {
		throw error(404, 'Pokemon not found');
	}

	const pokemonCards = allCards.filter((c: FullCard) => parseInt(c.numero) === pokemon.id && c.set);

	if (!pokemonCards.length) {
		throw error(404, 'No cards found for this Pokemon');
	}

	// Prepare evolution chain
	const currentPokemon = pokemon;

	// Find pre-evolution if it exists
	const preEvolution = currentPokemon.evolves_from ?
		pokemons.find((pokemon: Pokemon) => pokemon.id === currentPokemon.evolves_from) :
		undefined;

	// Find pre-pre-evolution if it exists (for 3-stage chains)
	const prePreEvolution = preEvolution?.evolves_from ?
		pokemons.find((pokemon: Pokemon) => pokemon.id === preEvolution.evolves_from) :
		undefined;

	// Find evolutions if they exist
	const evolutions = currentPokemon.evolves_to ?
		currentPokemon.evolves_to.map((evoId: number) =>
			pokemons.find((pokemon: Pokemon) => pokemon.id === evoId)
		) :
		[];

	// Find further evolutions if they exist
	const furtherEvolutions = evolutions.length ?
		evolutions.flatMap((evo: Pokemon | undefined) =>
			evo?.evolves_to ?
				evo.evolves_to.map((furtherEvoId: number) =>
					pokemons.find((pokemon: Pokemon) => pokemon.id === furtherEvoId)
				) :
				[]
		) :
		[];

	// Build the full chain
	const fullChain: Pokemon[] = [];

	if (prePreEvolution) fullChain.push(prePreEvolution);
	if (preEvolution) fullChain.push(preEvolution);
	fullChain.push(currentPokemon);
	evolutions.forEach((evo: Pokemon | undefined) => {
		if (evo) fullChain.push(evo);
	});
	furtherEvolutions.forEach((evo: Pokemon | undefined) => {
		if (evo) fullChain.push(evo);
	});

	// Remove duplicates if any
	const uniqueChain = fullChain.filter((pokemon: Pokemon, index: number, self: Pokemon[]) =>
		index === self.findIndex((p: Pokemon) => p.id === pokemon.id)
	);

	const capitalizedPokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

	return {
		cards: pokemonCards,
		pokemons,
		pokemon,
		evolutionChain: uniqueChain,
		title: capitalizedPokemonName,
		description: `${capitalizedPokemonName} - ${pokemon.description}`,
		image: {
			url: pokemonCards[0].image,
			alt: pokemon.description
		}
	};
}
