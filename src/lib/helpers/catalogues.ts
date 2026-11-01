export const LANGUAGES = ['en', 'ja', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Catalogue {
	adjective: string;
	cardRoute: string;
	gridRoute: string;
	language: Language;
	note?: string;
	routeCode: 'fr' | 'jp' | null;
	speciesTitles: boolean;
	tables: {cards: string; prices: string; sets: string};
}

export const CATALOGUES = {
	en: {
		adjective: 'English',
		cardRoute: '/card',
		gridRoute: '/cards-list',
		language: 'en',
		routeCode: null,
		speciesTitles: true,
		tables: {cards: 'cards', prices: 'prices', sets: 'sets'},
	},
	ja: {
		adjective: 'Japanese',
		cardRoute: '/jp-card',
		gridRoute: '/japan',
		language: 'ja',
		note: 'Japanese catalogue still incomplete. Cards with no Japanese scan show the English one of the same print.',
		routeCode: 'jp',
		speciesTitles: true,
		tables: {cards: 'jp_cards', prices: 'jp_prices', sets: 'jp_sets'},
	},
	fr: {
		adjective: 'French',
		cardRoute: '/fr-card',
		gridRoute: '/france',
		language: 'fr',
		note: 'Cards with no French scan show the English one.',
		routeCode: 'fr',
		speciesTitles: false,
		tables: {cards: 'fr_cards', prices: 'fr_prices', sets: 'fr_sets'},
	},
} as const satisfies Record<Language, Catalogue>;

export type CatalogueTables = (typeof CATALOGUES)[Language]['tables'];
export type CardTable = CatalogueTables['cards'];
export type PriceTable = CatalogueTables['prices'];
export type SetTable = CatalogueTables['sets'];

/**
 * Language -> `card_code` of the same card in each catalogue that carries it.
 * English and French share TCGdex ids, so the twin is found by id. Japanese ids are separate products that collide by accident
 * (`neo4-109` is Shining Mewtwo in English and a Trainer in Japanese), so a Japanese print is linked through `jp_cards.twin_tcgdex_id`,
 * which `bun run scrapers link` fills by matching language-independent traits.
 */
export type CardVersions = Partial<Record<Language, string>>;

export const BY_ROUTE_CODE = {fr: CATALOGUES.fr, jp: CATALOGUES.ja};
export const BY_GRID = {france: CATALOGUES.fr, japan: CATALOGUES.ja};

/** The catalogue a URL path belongs to: its grid page or one of its card pages, English for everything else. */
export const catalogueOfPath = (pathname: string): Catalogue =>
	Object.values<Catalogue>(CATALOGUES).find(catalogue => pathname === catalogue.gridRoute || pathname.startsWith(`${catalogue.cardRoute}/`)) ?? CATALOGUES.en;
