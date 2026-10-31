import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cardPrice } from '$helpers/card-utils';
import { pickCardOfTheDay } from '$helpers/card-dle';
import { getCards, getPrices } from '$helpers/supabase-data';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
		const cardOfTheDay = pickCardOfTheDay(new Date().toISOString().slice(0, 10), allCards, prices);

		if (!cardOfTheDay) {
			return json({ error: 'Impossible de déterminer la carte du jour' }, { status: 500 });
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return json({ error: 'Aucune carte sélectionnée' }, { status: 400 });
		}

		const guessedCard = allCards.find(card => card.cardCode === guessedCardCode);
		const guessedPrice = cardPrice(prices[guessedCardCode]);

		if (!guessedCard || !guessedPrice) {
			return json({ error: 'Carte non trouvée ou sans prix' }, { status: 404 });
		}

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
			isCorrectGuess
		});

	} catch (error) {
		console.error('❌ [CARD.DLE API] Erreur:', error);
		return json({ error: 'Erreur interne du serveur' }, { status: 500 });
	}
};
