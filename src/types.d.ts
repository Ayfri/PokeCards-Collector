export interface Card {
	id: number;
	image: string;
	meanColor: string;
	numero: string;
	pokemon: Pokemon;
	price: number;
	set_name: string;
	rarity: string;
	set: Set;
	types: string;
}

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
