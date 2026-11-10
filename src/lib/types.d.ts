import type { Language } from '#helpers/catalogues.ts';

export interface CardVariants {
	firstEdition: boolean;
	holo: boolean;
	normal: boolean;
	reverse: boolean;
	wPromo: boolean;
}

export interface Card {
	/** Extensionless TCGdex image base of the artwork a plate crops in place of a missing scan. Only on a card with no scan that has a source. */
	artImage?: string;
	/** Where `artImage` comes from: `lang:<language>`, `reprint:<tcgdex id>` or `energy:<tcgdex id>`. */
	artSource?: string;
	artist: string;
	cardCode: string;
	/** Drawn on a card page, including a related print swapped in from the card list, so the list reads carry it; the grid payloads leave it out. */
	cardMarketUpdatedAt?: string;
	cardMarketUrl: string;
	hp?: number;
	image: string;
	/** Set only on pages that mix catalogues (collection, wishlist, profile); absent means the catalogue of the page's path. */
	language?: Language;
	legalStandard?: boolean;
	localId: string;
	name: string;
	pokemonNumber?: number;
	/** Set only on the cards a grid payload carries: `cardPrice()` of the card, so the grid needs no price record. */
	price?: number | null;
	ptcgoCode?: string;
	rarity: string;
	regulationMark?: string;
	setId: string;
	setName: string;
	stage?: string;
	/** TCGdex's English `trainerType` or `energyType` (`Supporter`, `Item`, `Normal`, `Special`, see `SUBTYPE_SECTIONS`). Only on a Trainer or Energy card that has one. */
	subtype?: string;
	supertype: string;
	tcgdexId?: string;
	types: string;
	variants?: CardVariants | null;
}

export type FullCard = Card;

export interface Pokemon {
	id: number;
	name: string;
	description: string;
	evolves_from?: number;
	evolves_to?: number[];
}

/** What the card grid reads of a Pokémon: the Pokédex entry text stays out of its payloads. */
export type GridPokemon = Pick<Pokemon, 'id' | 'name'>;

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
	/** Set only on the non-English sets of the pages that mix catalogues: set ids repeat across languages (`base1`, `xy8`), so a lookup keys on both. */
	language?: Language;
	name: string;
	logo: string;
	printedTotal: number;
	ptcgoCode?: string;
	releaseDate: Date;
	series?: string;
	setId: string;
	symbol?: string;
	totalCards?: number;
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

/** A profile as shown to other visitors: the account id stays server side. */
export type PublicProfile = Omit<UserProfile, 'auth_id'>;

export interface UserCollection {
	id: string;
	username: string;
	card_code: string;
	created_at: string;
}

export interface UserWishlist {
	id: string;
	username: string;
	card_code: string;
	created_at: string;
}

export interface CollectionStats {
	cards_by_rarity: Record<string, number>;
	/** Keyed by `language:name`: the same set name exists in several languages and each is its own checklist. */
	set_completion: Record<
		string,
		{
			collectedValue: number;
			count: number;
			language: Language;
			name: string;
			percentage: number;
			set: Set;
			total: number;
			totalValue: number;
		}
	>;
	/** The most valuable owned cards, priced ones only. */
	top_cards: { card: Card; copies: number; price: number }[];
	total_instances: number;
	total_value: number;
	unique_cards: number;
	wishlist_count: number;
	wishlist_total_value: number;
}

export interface Image {
	url: string;
	alt: string;
	/** Declared to the crawlers as `og:image:width` / `og:image:height`, so a scraper can lay the preview out without downloading it. */
	height?: number;
	width?: number;
}

/** One step of the `BreadcrumbList` a page publishes, ordered from the site root to the page itself. */
export interface Breadcrumb {
	name: string;
	url: string;
}

/** Everything a page load may hand the `Seo` component through `page.data`. */
export interface SeoData {
	breadcrumbs?: Breadcrumb[];
	canonical?: string;
	description: string;
	image: Image;
	keywords?: string[];
	noindex?: boolean;
	schemas?: Record<string, unknown>[];
	title: string;
	type?: SeoType;
}

export type SeoType = 'Article' | 'CollectionPage' | 'ItemPage' | 'ProfilePage' | 'Product' | 'WebPage' | 'WebSite';

export interface SetLogoUrls {
	logo: string | null;
	symbol: string | null;
}

export type CardFilter = {
	set?: string[];
}

/**
 * One catalogue card as the binder needs it: the fields the storage panel draws, sorts and searches on.
 * Serving whole cards plus the price table would put 11.4 MB into the binder document.
 */
export interface BinderCatalogueCard {
	cardCode: string;
	image: string;
	localId: string;
	name: string;
	price: number | null;
	rarity: string;
	setId: string;
	setName: string;
	types: string;
}

/** One slot of a binder page. */
export interface BinderCards {
	id: string;
	url: string;
	position: number;
	cardCode: string | undefined;
}

export interface SearchedUser {
	is_public: boolean;
	profile_color?: string;
	username: string;
}

export interface UsernameCheckResult {
	exists: boolean;
	error: Error | string | null;
}

export interface ServiceResponse<T> {
	data: T | null;
	/** Also accepts a Supabase `PostgrestError`, an object with `message`, `details`, `hint` and `code`. */
	error: Error | { message: string; details?: string; hint?: string; code?: string; } | string | null;
}

/** Per-attribute comparison between a card.dle guess and the card of the day. */
export interface CardDleFeedback {
	artistCorrect: boolean;
	artistValue: string;
	pokemonCorrect: boolean;
	pokemonValue: string;
	/** Describes the guess: `higher` means the guessed card costs more than the mystery card. */
	priceComparison: 'higher' | 'lower' | 'correct';
	priceValue: number;
	rarityCorrect: boolean;
	rarityValue: string;
	setCorrect: boolean;
	setValue: string;
	supertypeCorrect: boolean;
	supertypeValue: string;
	typesCorrect: boolean;
	typesValue: string;
}

/** The fields the card.dle picker draws. Sending whole cards plus the catalogue and price table in the page made a 13.7 MB document. */
export interface CardDleSuggestion {
	/** Compared with the feedback's artist by the easy mode filter. */
	artist: string;
	cardCode: string;
	image: string;
	name: string;
	/** The whole card, only for a card with no scan: its placeholder plate draws the name, type and kind from it. */
	plate?: FullCard;
	pokemonName: string;
	pokemonNumber?: number;
	price: number;
	/** Compared with the feedback's rarity by the easy mode filter. */
	rarity: string;
	/** Looked up in the layout's sets for the logo, so the payload carries no image URL per card. */
	setId: string;
	setName: string;
	/** Compared with the feedback's supertype by the easy mode filter. */
	supertype: string;
	/** The raw comma-separated `types` string, the one the guess endpoint compares with `===`. */
	types: string;
}

/** One judged guess, as the board draws it and localStorage keeps it. */
export interface CardDleGuess {
	cardCode: string;
	feedback: CardDleFeedback;
	image: string;
	isCorrect: boolean;
	name: string;
	/** The whole card, only when it has no scan, for its placeholder plate. */
	plate?: FullCard;
	pokemonNumber?: number;
	/** Looked up in the layout's sets for the logo. */
	setId: string;
}

/** A guess waiting for the server's verdict: the board draws it as a skeleton row. */
export type CardDlePendingGuess = Pick<CardDleGuess, 'cardCode' | 'image' | 'name' | 'plate'>;

/** Response of `POST /api/card-dle/guess`. */
export type CardDleGuessResponse =
	| {
		/** The UTC day of the mystery card the guess was judged against: the board the guess belongs to. */
		date: string;
		feedback: CardDleFeedback;
		guessedCard: FullCard;
		isCorrectGuess: boolean;
		success: true;
	}
	| { error: string; success?: false };

/** Row returned by the `search_public_users_with_stats` RPC. */
export interface SearchedUserWithStats extends SearchedUser {
	created_at: string;
	profile_color: string | null;
	unique_card_count: number;
}

/** Response of `GET /api/search-users`. */
export type SearchUsersResponse =
	| { success: true; users: SearchedUserWithStats[] }
	| { success?: false; error: string };
