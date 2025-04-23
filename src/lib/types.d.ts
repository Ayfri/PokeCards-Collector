export interface Card {
	artist: string;
	cardCode: string;
	cardMarketUpdatedAt: string;
	cardMarketUrl: string;
	image: string;
	meanColor: string;
	name: string;
	pokemonNumber?: number;
	rarity: string;
	setName: string;
	supertype: string;
	types: string;
}

export type FullCard = Card;

export interface Pokemon {
	id: number;
	name: string;
	description: string;
	evolves_from?: number;
	evolves_to?: number[];
}

export interface PriceData {
	simple?: number;
	low?: number;
	trend?: number;
	avg1?: number;
	avg7?: number;
	avg30?: number;
	reverseSimple?: number;
	reverseLow?: number;
	reverseTrend?: number;
	reverseAvg1?: number;
	reverseAvg7?: number;
	reverseAvg30?: number;
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

export interface Image {
	url: string;
	alt: string;
}

export interface SetLogoUrls {
	logo: string | null;
	symbol: string | null;
}

export type CardFilter = {
	set?: string[];
}
