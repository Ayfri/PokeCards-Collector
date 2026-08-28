/** Subset of the TCGdex v2 schema the pipeline consumes. */

export interface TcgdexCardMarketPricing {
	updated?: string;
	unit?: string;
	idProduct?: number;
	avg?: number;
	low?: number;
	trend?: number;
	avg1?: number;
	avg7?: number;
	avg30?: number;
	'avg-holo'?: number;
	'low-holo'?: number;
	'trend-holo'?: number;
	'avg1-holo'?: number;
	'avg7-holo'?: number;
	'avg30-holo'?: number;
}

export interface TcgdexTcgPlayerVariantPricing {
	productId?: number;
	lowPrice?: number;
	midPrice?: number;
	highPrice?: number;
	marketPrice?: number;
	directLowPrice?: number;
}

export interface TcgdexTcgPlayerPricing {
	unit?: string;
	updated?: string;
	[variant: string]: TcgdexTcgPlayerVariantPricing | string | undefined;
}

export interface TcgdexPricing {
	cardmarket?: TcgdexCardMarketPricing | null;
	tcgplayer?: TcgdexTcgPlayerPricing | null;
}

export interface TcgdexVariants {
	firstEdition: boolean;
	holo: boolean;
	normal: boolean;
	reverse: boolean;
	wPromo: boolean;
}

export interface TcgdexCardCount {
	official?: number;
	total?: number;
	holo?: number;
	normal?: number;
	reverse?: number;
	firstEd?: number;
}

export interface TcgdexSetBrief {
	id: string;
	name: string;
	logo?: string;
	symbol?: string;
	cardCount?: TcgdexCardCount;
}

export interface TcgdexSet extends TcgdexSetBrief {
	abbreviation?: {official?: string; short?: string};
	releaseDate?: string;
	serie?: {id: string; name: string};
	cards?: TcgdexCardBrief[];
}

export interface TcgdexCardBrief {
	id: string;
	localId: string;
	name: string;
	image?: string;
}

export interface TcgdexCard extends TcgdexCardBrief {
	category?: string;
	illustrator?: string;
	rarity?: string;
	set?: TcgdexSetBrief;
	variants?: TcgdexVariants;
	dexId?: number[];
	hp?: number;
	types?: string[];
	stage?: string;
	regulationMark?: string;
	legal?: {standard?: boolean; expanded?: boolean};
	updated?: string;
	pricing?: TcgdexPricing | null;
}

/** Shape returned by the bulk GraphQL metadata query. */
export interface TcgdexGraphqlCard {
	id: string;
	localId: string;
	name: string;
	image?: string | null;
	rarity?: string | null;
	category?: string | null;
	illustrator?: string | null;
	dexId?: number[] | null;
	types?: string[] | null;
	stage?: string | null;
	hp?: number | null;
	regulationMark?: string | null;
	set?: {id: string; name: string} | null;
	variants?: TcgdexVariants | null;
}
