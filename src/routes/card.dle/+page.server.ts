import type { PageServerLoad } from './$types';
import type { FullCard, PriceData } from '$lib/types';

interface CardSuggestion extends FullCard {
	pokemonName: string;
	price: number;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	// Attendre que les données streamées soient résolues
	const [allCards, prices] = await Promise.all([
		parentData.streamed.allCards,
		parentData.streamed.prices
	]);

	if (!allCards || !prices) {
		console.error('Card.dle: Données critiques non chargées.');
		return {
			...parentData,
			cardSuggestions: [],
			allCards,
			prices
		};
	}

	// Générer les suggestions de cartes filtrées et avec prix
	const suggestions: CardSuggestion[] = [];
	for (const card of allCards) {
		const priceEntry = prices[card.cardCode];

		// Exclure les cartes test et s'assurer qu'elles ont un prix >= 3€
		if (card.pokemonNumber !== 9999 && priceEntry?.simple && priceEntry.simple >= 3) {
			suggestions.push({
				...card,
				pokemonName: card.name.split(' ')[0], // Premier mot du nom
				price: priceEntry.simple
			});
		}
	}

	// Trier par nom pour faciliter la recherche
	suggestions.sort((a, b) => a.name.localeCompare(b.name));

	return {
		...parentData,
		cardSuggestions: suggestions,
		allCards,
		prices,
		title: 'Card.dle - PokéCards-Collector',
		description: 'Devinez la carte Pokémon du jour !',
	};
};
