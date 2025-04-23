import type { Card } from '$lib/types';

export type FetchedCard = {
	id: string;
	name: string;
	rarity: string;
	images: {
		small: string;
		large: string;
	};
	nationalPokedexNumbers?: number[];
	set: {
		name: string;
	};
	cardmarket: {
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
	tcgplayer?: {
		url?: string;
		updatedAt?: string;
		prices?: {
			holofoil?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			reverseHolofoil?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			normal?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			'1stEditionHolofoil'?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
			'1stEditionNormal'?: {
				low?: number;
				mid?: number;
				high?: number;
				market?: number;
				directLow?: number;
			};
		};
	};
	types?: string[];
	supertype: string;
	artist?: string;
};

export type FetchedCardsResponse = {
	data: FetchedCard[];
	totalCount: number; // Added totalCount based on usage in fetchCards
};

export type FetchedSet = {
	name: string;
	images: {
		logo: string;
	};
	printedTotal: number;
	ptcgoCode: string;
	releaseDate: string; // YYYY/MM/DD
};

export type FetchedSetsResponse = {
	data: FetchedSet[];
};

export type SetMappingInfo = {
	primarySetName: string;
	primarySetCode: string;
};

export type SetMappings = Record<string, SetMappingInfo>;

export type ProcessedCard = Card;