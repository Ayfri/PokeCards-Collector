/**
 * Logo and symbol of the English sets TCGdex holds no image for, as the pokemontcg.io API lists them: the images the collector
 * community settled on. Newer sets live on scrydex, its image host, with no extension. Only tried after the TCGdex CDN, so an
 * upload there takes over. pokemontcg.io gives the 2011-2021 McDonald's collections the same arches logo, so the 2023 and 2024
 * ones it does not list reuse it.
 */
const MCDONALDS_LOGO = 'https://images.pokemontcg.io/mcd21/logo.png';

export const COMMUNITY_SET_IMAGES: Record<string, {logo: string; symbol?: string}> = {
	'2011bw': {logo: 'https://images.pokemontcg.io/mcd11/logo.png', symbol: 'https://images.pokemontcg.io/mcd11/symbol.png'},
	'2012bw': {logo: 'https://images.pokemontcg.io/mcd12/logo.png', symbol: 'https://images.pokemontcg.io/mcd12/symbol.png'},
	'2014xy': {logo: 'https://images.pokemontcg.io/mcd14/logo.png', symbol: 'https://images.pokemontcg.io/mcd14/symbol.png'},
	'2015xy': {logo: 'https://images.pokemontcg.io/mcd15/logo.png', symbol: 'https://images.pokemontcg.io/mcd15/symbol.png'},
	'2016xy': {logo: 'https://images.pokemontcg.io/mcd16/logo.png', symbol: 'https://images.pokemontcg.io/mcd16/symbol.png'},
	'2017sm': {logo: 'https://images.pokemontcg.io/mcd17/logo.png', symbol: 'https://images.pokemontcg.io/mcd17/symbol.png'},
	'2018sm': {logo: 'https://images.pokemontcg.io/mcd18/logo.png', symbol: 'https://images.pokemontcg.io/mcd18/symbol.png'},
	'2019sm': {logo: 'https://images.pokemontcg.io/mcd19/logo.png', symbol: 'https://images.pokemontcg.io/mcd19/symbol.png'},
	'2021swsh': {logo: 'https://images.pokemontcg.io/mcd21/logo.png', symbol: 'https://images.pokemontcg.io/mcd21/symbol.png'},
	'2022swsh': {logo: 'https://images.pokemontcg.io/mcd22/logo.png', symbol: 'https://images.pokemontcg.io/mcd22/symbol.png'},
	'2023sv': {logo: MCDONALDS_LOGO},
	'2024sv': {logo: MCDONALDS_LOGO},
	'30th-c': {logo: 'https://images.scrydex.com/pokemon/me55c-logo/logo', symbol: 'https://images.scrydex.com/pokemon/me55c-symbol/symbol'},
	'bog': {logo: 'https://images.pokemontcg.io/bp/logo.png', symbol: 'https://images.pokemontcg.io/bp/symbol.png'},
	'cel25cc': {logo: 'https://images.pokemontcg.io/cel25c/logo.png', symbol: 'https://images.pokemontcg.io/cel25c/symbol.png'},
	'sm3.5': {logo: 'https://images.pokemontcg.io/sm35/logo.png', symbol: 'https://images.pokemontcg.io/sm35/symbol.png'},
	'sm7.5': {logo: 'https://images.pokemontcg.io/sm75/logo.png', symbol: 'https://images.pokemontcg.io/sm75/symbol.png'},
	'sve': {logo: 'https://images.pokemontcg.io/sve/logo.png', symbol: 'https://images.pokemontcg.io/sve/symbol.png'},
	'svp': {logo: 'https://images.pokemontcg.io/svp/logo.png', symbol: 'https://images.pokemontcg.io/svp/symbol.png'},
	'swsh4.5sv': {logo: 'https://images.pokemontcg.io/swsh45sv/logo.png', symbol: 'https://images.pokemontcg.io/swsh45sv/symbol.png'},
	'swsh9tg': {logo: 'https://images.pokemontcg.io/swsh9tg/logo.png', symbol: 'https://images.pokemontcg.io/swsh9tg/symbol.png'},
	'swsh10tg': {logo: 'https://images.pokemontcg.io/swsh10tg/logo.png', symbol: 'https://images.pokemontcg.io/swsh10tg/symbol.png'},
	'swsh11tg': {logo: 'https://images.pokemontcg.io/swsh11tg/logo.png', symbol: 'https://images.pokemontcg.io/swsh11tg/symbol.png'},
	'swsh12tg': {logo: 'https://images.pokemontcg.io/swsh12tg/logo.png', symbol: 'https://images.pokemontcg.io/swsh12tg/symbol.png'},
	'swsh12.5gg': {logo: 'https://images.pokemontcg.io/swsh12pt5gg/logo.png', symbol: 'https://images.pokemontcg.io/swsh12pt5gg/symbol.png'},
	'tk-ex-latia': {logo: 'https://images.pokemontcg.io/tk1a/logo.png', symbol: 'https://images.pokemontcg.io/tk1a/symbol.png'},
	'tk-ex-latio': {logo: 'https://images.pokemontcg.io/tk1b/logo.png', symbol: 'https://images.pokemontcg.io/tk1b/symbol.png'},
	'tk-ex-m': {logo: 'https://images.pokemontcg.io/tk2b/logo.png', symbol: 'https://images.pokemontcg.io/tk2b/symbol.png'},
	'tk-ex-p': {logo: 'https://images.pokemontcg.io/tk2a/logo.png', symbol: 'https://images.pokemontcg.io/tk2a/symbol.png'},
};
