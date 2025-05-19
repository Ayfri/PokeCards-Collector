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
	aliases?: string[];
	name: string;
	logo: string;
	printedTotal: number;
	ptcgoCode?: string;
	releaseDate: Date;
	series?: string;
}


export interface SetWithPrice extends Set {
	totalPrice: number;
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
	auth_id: string;
	created_at: string;
	is_public: boolean;
	profile_color?: string;
	updated_at: string;
	username: string;
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
	cards_by_rarity: Record<string, number>;
	set_completion: Record<
		string,
		{
			collectedValue: number;
			count: number;
			percentage: number;
			total: number;
			totalValue: number;
		}
	>;
	total_instances: number;
	total_value: number;
	unique_cards: number;
	wishlist_count: number;
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

export interface BinderCards {
	id: string;
	url: string;
	position: number;
	cardCode: string | undefined;
}

// Represents the structure of a user object returned by the searchUsers service function
export interface SearchedUser {
	auth_id: string;
	is_public: boolean;
	profile_color?: string; // Consistent with UserProfile
	username: string;
}

// Represents the result of the isUsernameTaken service function
export interface UsernameCheckResult {
	exists: boolean;
	error: Error | Record<string, any> | string | null; // Adjusted for more specific error types
}

// Generic type for responses from service functions (e.g., Supabase calls)
export interface ServiceResponse<T> {
	data: T | null;
	// Accommodate Supabase PostgrestError (which is an object with message, details, hint, code) or other error types
	error: Error | { message: string; details?: string; hint?: string; code?: string; } | string | null;
}
