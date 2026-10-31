import type { RequestHandler } from './$types';
import { cardPrice } from '#helpers/card-utils.ts';
import { pickCardOfTheDay } from '#helpers/card-dle.ts';
import { getCards, getPrices } from '#helpers/supabase-data.ts';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
		const cardOfTheDay = pickCardOfTheDay(new Date().toISOString().slice(0, 10), allCards, prices);

		if (!cardOfTheDay) {
			return Response.json({ error: 'Impossible de déterminer la carte du jour' }, { status: 500 });
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return Response.json({ error: 'Aucune carte sélectionnée' }, { status: 400 });
		}

		const guessedCard = allCards.find(card => card.cardCode === guessedCardCode);
		const guessedPrice = cardPrice(prices[guessedCardCode]);

		if (!guessedCard || !guessedPrice) {
			return Response.json({ error: 'Carte non trouvée ou sans prix' }, { status: 404 });
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

		return Response.json({
			success: true,
			guessedCardName: guessedCard.name,
			guessedCardImage: guessedCard.image,
			guessedPokemonNumber: guessedCard.pokemonNumber,
			feedback,
			isCorrectGuess
		});

	} catch (error) {
		console.error('❌ [CARD.DLE API] Erreur:', error);
		return Response.json({ error: 'Erreur interne du serveur' }, { status: 500 });
	}
};
