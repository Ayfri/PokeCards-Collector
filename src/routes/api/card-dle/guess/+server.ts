import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FullCard, PriceData } from '$lib/types';
import { getCards, getPrices } from '$helpers/data';

interface CardOfTheDay extends FullCard {
	price: number;
}

// Cache des données
let allCards: FullCard[] | null = null;
let prices: Record<string, PriceData> | null = null;
let cardOfTheDay: CardOfTheDay | null = null;
let lastLoadDate = '';

// Fonction pour générer une carte du jour basée sur la date
function selectDailyCard(cards: FullCard[], priceData: Record<string, PriceData>): CardOfTheDay | null {
	// Filtrer les cartes avec prix >= 3€ et qui ne sont pas des cartes "test" (pokemonNumber !== 9999)
	const eligibleCards: CardOfTheDay[] = [];

	for (const card of cards) {
		const priceEntry = priceData[card.cardCode];
		if (card.pokemonNumber !== 9999 && priceEntry?.simple && priceEntry.simple >= 3) {
			eligibleCards.push({
				...card,
				price: priceEntry.simple
			});
		}
	}

	if (eligibleCards.length === 0) return null;

	// Utiliser la date du jour pour générer un index reproductible
	const today = new Date();
	const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

	// Trier les cartes par cardCode pour avoir un ordre déterministe
	eligibleCards.sort((a, b) => a.cardCode.localeCompare(b.cardCode));

	// Utiliser un simple modulo avec la seed pour sélectionner la carte
	const index = seed % eligibleCards.length;
	return eligibleCards[index];
}

async function loadDataIfNeeded(): Promise<boolean> {
	const today = new Date().toDateString();

	// Charger les données si c'est un nouveau jour ou si les données ne sont pas en cache
	if (lastLoadDate !== today || !allCards || !prices) {
		try {
			[allCards, prices] = await Promise.all([getCards(), getPrices()]);
			cardOfTheDay = selectDailyCard(allCards, prices);
			lastLoadDate = today;
			return true;
		} catch (error) {
			console.error('❌ [CARD.DLE API] Erreur lors du chargement des données:', error);
			return false;
		}
	}
	return true;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Charger les données si nécessaire
		if (!await loadDataIfNeeded()) {
			return json({ error: 'Impossible de charger les données du jeu' }, { status: 500 });
		}

		if (!cardOfTheDay) {
			return json({ error: 'Impossible de déterminer la carte du jour' }, { status: 500 });
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return json({ error: 'Aucune carte sélectionnée' }, { status: 400 });
		}

		// Trouver la carte devinée
		const guessedCard = allCards!.find(card => card.cardCode === guessedCardCode);
		const guessedPrice = prices![guessedCardCode]?.simple;

		if (!guessedCard || !guessedPrice) {
			return json({ error: 'Carte non trouvée ou sans prix' }, { status: 404 });
		}

		if (guessedCard.pokemonNumber === 9999) {
			return json({ error: 'Sélection de carte invalide' }, { status: 400 });
		}

		// Calculer le feedback
		const feedback = {
			pokemonCorrect: guessedCard.name === cardOfTheDay.name,
			pokemonValue: guessedCard.name,
			artistCorrect: guessedCard.artist === cardOfTheDay.artist,
			artistValue: guessedCard.artist,
			setCorrect: guessedCard.setName === cardOfTheDay.setName,
			setValue: guessedCard.setName,
			supertypeCorrect: guessedCard.supertype === cardOfTheDay.supertype,
			supertypeValue: guessedCard.supertype,
			typesCorrect: guessedCard.types === cardOfTheDay.types,
			typesValue: guessedCard.types,
			priceComparison: guessedPrice > cardOfTheDay.price ? 'higher' :
							guessedPrice < cardOfTheDay.price ? 'lower' : 'correct',
			priceValue: guessedPrice,
		};

		const isCorrectGuess = feedback.pokemonCorrect &&
							   feedback.artistCorrect &&
							   feedback.setCorrect &&
							   feedback.supertypeCorrect &&
							   feedback.typesCorrect &&
							   feedback.priceComparison === 'correct';

		return json({
			success: true,
			guessedCardName: guessedCard.name,
			guessedCardImage: guessedCard.image,
			guessedPokemonNumber: guessedCard.pokemonNumber,
			feedback,
			isCorrectGuess,
			cardOfTheDayForTesting: cardOfTheDay
		});

	} catch (error) {
		console.error('❌ [CARD.DLE API] Erreur:', error);
		return json({ error: 'Erreur interne du serveur' }, { status: 500 });
	}
};
