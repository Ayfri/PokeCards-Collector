import { getCards, getPokemons } from '$helpers/data';
import type { Pokemon } from '~/types';
import { error } from '@sveltejs/kit';

// Cache pour optimiser les chargements répétés
const cachedPokemonCards = new Map();

export const load = async ({ params, parent, url }) => {
	const pokemons = await getPokemons();
	
	// Extrait l'ID du Pokémon de l'URL
	const pokemonId = parseInt(params.numero);
	
	// Récupère les paramètres de la carte spécifique
	const setCode = url.searchParams.get('set');
	const cardNumber = url.searchParams.get('number');
	
	// Vérifie d'abord le cache
	const cacheKey = `pokemon_${pokemonId}_${setCode || ''}_${cardNumber || ''}`;
	if (cachedPokemonCards.has(cacheKey)) {
		return cachedPokemonCards.get(cacheKey);
	}
	
	// Cherche le Pokémon
	const pokemon = pokemons.find((p) => p.id === pokemonId);
	if (!pokemon) {
		throw error(404, 'Pokemon not found');
	}
	
	// Charge les cartes - seule une partie réduite (optimisé par le flag false)
	const { allCards } = await parent();
	
	// Filtre pour ne garder que les cartes pertinentes pour ce Pokémon
	const pokemonCards = allCards.filter((c) => parseInt(c.numero) === pokemon.id && c.set);
	
	if (!pokemonCards.length) {
		throw error(404, 'No cards found for this Pokemon');
	}
	
	// Trie initialement par prix décroissant
	pokemonCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
	
	// Prépare la chaîne d'évolution
	const currentPokemon = pokemon;

	// Construction optimisée de la chaîne d'évolution
	const evolutionChain = buildEvolutionChain(currentPokemon, pokemons);
	
	// Réordonne les cartes selon les paramètres d'URL
	let targetCard = null;
	if (setCode && cardNumber) {
		targetCard = pokemonCards.find(card => {
			const cardSetCode = card.set?.ptcgoCode;
			const imageCardNumber = card.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');
			return cardSetCode === setCode && imageCardNumber === cardNumber;
		});
	}

	// Réordonne le tableau si une carte correspondante a été trouvée
	if (targetCard) {
		// Place la carte ciblée au début du tableau
		const remainingCards = pokemonCards.filter(card => card !== targetCard);
		pokemonCards.splice(0, pokemonCards.length, targetCard, ...remainingCards);
	}

	const capitalizedPokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
	
	// Prépare le résultat
	const result = {
		cards: pokemonCards,
		pokemons,
		pokemon,
		evolutionChain,
		title: capitalizedPokemonName,
		description: `${capitalizedPokemonName} - ${pokemon.description}`,
		image: {
			url: pokemonCards[0].image,
			alt: pokemon.description
		}
	};
	
	// Stocke dans le cache pour les futurs appels
	cachedPokemonCards.set(cacheKey, result);
	
	// Limite la taille du cache
	if (cachedPokemonCards.size > 50) {
		// Supprime les entrées les plus anciennes
		const oldestKey = cachedPokemonCards.keys().next().value;
		cachedPokemonCards.delete(oldestKey);
	}
	
	return result;
};

// Fonction pour construire la chaîne d'évolution de manière optimisée
function buildEvolutionChain(currentPokemon: Pokemon, pokemons: Pokemon[]): Pokemon[] {
	// Trouver les pré-évolutions
	let preEvolution = currentPokemon.evolves_from ?
		pokemons.find((p) => p.id === currentPokemon.evolves_from) : undefined;
	
	let prePreEvolution = preEvolution?.evolves_from ?
		pokemons.find((p) => p.id === preEvolution.evolves_from) : undefined;
	
	// Trouver les évolutions directes
	const evolutions = currentPokemon.evolves_to ?
		currentPokemon.evolves_to
			.map((evoId) => pokemons.find((p) => p.id === evoId))
			.filter((p): p is Pokemon => p !== undefined) : [];
	
	// Trouver les évolutions ultérieures (deuxième niveau)
	const furtherEvolutions = evolutions.flatMap((evo) =>
		evo.evolves_to ?
			evo.evolves_to
				.map((furtherEvoId) => pokemons.find((p) => p.id === furtherEvoId))
				.filter((p): p is Pokemon => p !== undefined) : []
	);
	
	// Construire la chaîne complète
	const chain: Pokemon[] = [];
	if (prePreEvolution) chain.push(prePreEvolution);
	if (preEvolution) chain.push(preEvolution);
	chain.push(currentPokemon);
	chain.push(...evolutions);
	chain.push(...furtherEvolutions);
	
	// Dédupliquer
	return chain.filter((pokemon, index, self) =>
		index === self.findIndex((p) => p.id === pokemon.id)
	);
}
