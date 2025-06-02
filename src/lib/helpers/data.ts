// Re-export toutes les fonctions depuis supabase-data.ts pour la compatibilité
export {
	getPokemons,
	getCards,
	getJapaneseCards,
	getPrices,
	getSets,
	getJapaneseSets,
	getTypes,
	getRarities,
	getArtists,
	getCardsWithFilters,
	getCardByCode,
	getCardPrice
} from './supabase-data';

// Fonction legacy pour getHoloFoilsCards (si nécessaire)
// Cette fonction n'est pas migrée vers Supabase pour l'instant
export async function getHoloFoilsCards() {
	// Pour l'instant, retourner un tableau vide
	// Cette fonction peut être supprimée si elle n'est plus utilisée
	return [];
}
