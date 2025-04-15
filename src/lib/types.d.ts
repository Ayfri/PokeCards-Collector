export interface Card {
	artist: string;
	cardCode: string;
	cardMarketUpdatedAt: string;
	cardMarketUrl: string;
	image: string;
	meanColor: string;
	name: string;
	pokemonNumber?: number;
	price: number;
	rarity: string;
	setName: string;
	supertype: string;
	types: string;
}

export interface CardMarketPrices {
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
}

export type FullCard = Card;

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
	ptcgoCode?: string;
	releaseDate: Date;
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

export interface SpriteCache {
	subscribe: any;
	getSprite: (id: number) => Promise<string>;
}

export interface UserProfile {
	username: string;
	auth_id: string;
	avatar_url?: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

export interface UserCollection {
	id: string;
	username: string;
	card_code: string;
	created_at: string;
	updated_at: string;
}

export interface UserWishlist {
	id: string;
	username: string;
	card_code: string;
	created_at: string;
	updated_at: string;
}

export interface CollectionStats {
	total_cards: number;
	total_value: number;
	cards_by_rarity: Record<string, number>;
	cards_by_set: Record<string, number>;
}
