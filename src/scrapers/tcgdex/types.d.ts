/** Subset of the TCGdex v2 schema the pipeline consumes. */

export interface TcgdexCardMarketPricing {
	updated?: string;
	unit?: string;
	idProduct?: number;
	avg?: number | null;
	low?: number | null;
	trend?: number | null;
	avg1?: number | null;
	avg7?: number | null;
	avg30?: number | null;
	'avg-holo'?: number | null;
	'low-holo'?: number | null;
	'trend-holo'?: number | null;
	'avg1-holo'?: number | null;
	'avg7-holo'?: number | null;
	'avg30-holo'?: number | null;
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

export interface TcgdexAttack {
	cost?: string[];
	damage?: string | number;
}

export interface TcgdexCard extends TcgdexCardBrief {
	/** `abilities`, `attacks`, `resistances`, `retreat` and `weaknesses` are only read by `link.ts`, which matches Japanese cards to English ones on them. */
	abilities?: unknown[];
	attacks?: TcgdexAttack[];
	resistances?: {type: string}[];
	retreat?: number;
	weaknesses?: {type: string}[];
	category?: string;
	illustrator?: string;
	rarity?: string;
	set?: TcgdexSetBrief;
	variants?: TcgdexVariants;
	dexId?: number[];
	hp?: number;
	types?: string[];
	stage?: string;
	/** Only on Energy cards. */
	energyType?: string;
	/** Only on Trainer cards. */
	trainerType?: string;
	regulationMark?: string;
	legal?: {standard?: boolean; expanded?: boolean};
	updated?: string;
	pricing?: TcgdexPricing | null;
}
