import type { RequestHandler } from './$types';
import { cardPrice } from '#helpers/card-utils.ts';
import { pickCardOfTheDay, utcDay } from '#helpers/card-dle.ts';
import { getCards, getPrices } from '#helpers/supabase-data.ts';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const [allCards, prices] = await Promise.all([getCards(), getPrices()]);
		const date = utcDay();
		const cardOfTheDay = pickCardOfTheDay(date, allCards, prices);

		if (!cardOfTheDay) {
			return Response.json({ error: 'Could not pick the card of the day' }, { status: 500 });
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return Response.json({ error: 'No card selected' }, { status: 400 });
		}

		const guessedCard = allCards.find(card => card.cardCode === guessedCardCode);
		const guessedPrice = cardPrice(prices[guessedCardCode]);

		if (!guessedCard || !guessedPrice) {
			return Response.json({ error: 'Card not found or without a price' }, { status: 404 });
		}

		const feedback = {
			artistCorrect: guessedCard.artist === cardOfTheDay.artist,
			artistValue: guessedCard.artist,
			pokemonCorrect: guessedCard.name === cardOfTheDay.name,
			pokemonValue: guessedCard.name,
			priceComparison: guessedPrice > cardOfTheDay.price ? 'higher' :
							guessedPrice < cardOfTheDay.price ? 'lower' : 'correct',
			priceValue: guessedPrice,
			rarityCorrect: guessedCard.rarity === cardOfTheDay.rarity,
			rarityValue: guessedCard.rarity,
			setCorrect: guessedCard.setName === cardOfTheDay.setName,
			setValue: guessedCard.setName,
			supertypeCorrect: guessedCard.supertype === cardOfTheDay.supertype,
			supertypeValue: guessedCard.supertype,
			typesCorrect: guessedCard.types === cardOfTheDay.types,
			typesValue: guessedCard.types,
		};

		const isCorrectGuess = feedback.pokemonCorrect &&
							   feedback.artistCorrect &&
							   feedback.setCorrect &&
							   feedback.rarityCorrect &&
							   feedback.supertypeCorrect &&
							   feedback.typesCorrect &&
							   feedback.priceComparison === 'correct';

		return Response.json({
			date,
			feedback,
			guessedCard,
			isCorrectGuess,
			success: true
		});

	} catch (error) {
		console.error('Card.dle guess failed:', error);
		return Response.json({ error: 'Internal server error' }, { status: 500 });
	}
};
