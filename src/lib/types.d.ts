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
	card_id: string;
	quantity: number;
	created_at: string;
	updated_at: string;
}

export interface UserWishlist {
	id: string;
	username: string;
	card_id: string;
	created_at: string;
	updated_at: string;
}

export interface CollectionStats {
	total_cards: number;
	total_value: number;
	cards_by_rarity: Record<string, number>;
	cards_by_set: Record<string, number>;
}
