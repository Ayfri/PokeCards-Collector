export interface Card {
	id: string;
	image: string;
	meanColor: string;
	name: string;
	numero: string;
	pokemon?: Pokemon;
	price?: number;
	rarity: string;
	set_name: string;
	set?: Set;
	types: string;
	supertype: string;
	artist?: string;
	tcgplayer?: {
		url: string;
		updatedAt: string;
		prices: Record<string, {
			low?: number;
			mid?: number;
			high?: number;
			market?: number;
			directLow?: number;
		}>;
	};
	cardmarket?: {
		url: string;
		updatedAt: string;
		prices: {
			averageSellPrice: number;
			lowPrice: number;
			trendPrice: number;
			germanProLow: number;
			suggestedPrice: number;
			reverseHoloSell: number;
			reverseHoloLow: number;
			reverseHoloTrend: number;
			lowPriceExPlus: number;
			avg1: number;
			avg7: number;
			avg30: number;
			reverseHoloAvg1: number;
			reverseHoloAvg7: number;
			reverseHoloAvg30: number;
		};
	};
}

export type FullCard = Card & {
	pokemon: Pokemon;
	set: Set;
};

export interface Pokemon {
	id: number;
	name: string;
	description: string;
	evolves_from?: number;
	evolves_to?: number[];
}

export interface Set {
	name: string;
	logo: string;
	printedTotal: number;
	ptcgoCode: string;
}

export interface User {
	id: number;
	username: string;
	password: string;
	email: string;
}

export interface PokemonStats {
	cards: Card[];
	name: string;
}
