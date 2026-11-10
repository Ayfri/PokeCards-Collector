/** Subset of the TCGdex v2 schema the pipeline consumes. */

export interface TcgdexCardMarketPricing {
	avg?: number | null;
	avg1?: number | null;
	'avg1-holo'?: number | null;
	avg7?: number | null;
	'avg7-holo'?: number | null;
	avg30?: number | null;
	'avg30-holo'?: number | null;
	'avg-holo'?: number | null;
	idProduct?: number;
	low?: number | null;
	'low-holo'?: number | null;
	trend?: number | null;
	'trend-holo'?: number | null;
	unit?: string;
	updated?: string;
}

export interface TcgdexPricing {
	cardmarket?: TcgdexCardMarketPricing | null;
}

export interface TcgdexVariants {
	firstEdition: boolean;
	holo: boolean;
	normal: boolean;
	reverse: boolean;
	wPromo: boolean;
}

export interface TcgdexCardCount {
	firstEd?: number;
	holo?: number;
	normal?: number;
	official?: number;
	reverse?: number;
	total?: number;
}

export interface TcgdexSetBrief {
	cardCount?: TcgdexCardCount;
	id: string;
	logo?: string;
	name: string;
	symbol?: string;
}

export interface TcgdexSet extends TcgdexSetBrief {
	abbreviation?: {official?: string; short?: string};
	cards?: TcgdexCardBrief[];
	releaseDate?: string;
	serie?: {id: string; name: string};
}

export interface TcgdexCardBrief {
	id: string;
	image?: string;
	localId: string;
	name: string;
}

export interface TcgdexAttack {
	cost?: string[];
	damage?: string | number;
}

export interface TcgdexCard extends TcgdexCardBrief {
	/** `abilities`, `attacks`, `resistances`, `retreat` and `weaknesses` are only read by `link.ts`, which matches Japanese cards to English ones on them. */
	abilities?: unknown[];
	attacks?: TcgdexAttack[];
	category?: string;
	dexId?: number[];
	/** Only on Energy cards. */
	energyType?: string;
	hp?: number;
	illustrator?: string;
	legal?: {expanded?: boolean; standard?: boolean};
	pricing?: TcgdexPricing | null;
	rarity?: string;
	regulationMark?: string;
	resistances?: {type: string}[];
	retreat?: number;
	set?: TcgdexSetBrief;
	stage?: string;
	/** Only on Trainer cards. */
	trainerType?: string;
	types?: string[];
	updated?: string;
	variants?: TcgdexVariants;
	weaknesses?: {type: string}[];
}
