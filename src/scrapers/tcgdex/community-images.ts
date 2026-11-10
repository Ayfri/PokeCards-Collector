/**
 * Logo and symbol of the sets TCGdex has no image for, as the pokemontcg.io API lists them: the images the collector
 * community settled on. Newer sets use scrydex, its image host, with no file extension. They are only tried after the TCGdex
 * CDN, so an upload there takes over. pokemontcg.io gives the 2011-2021 McDonald's collections the same arches logo, so the
 * 2023 and 2024 ones it does not list reuse it. An entry may fill only one of the two. French set ids are the English ones, so these also serve French.
 * Japanese sets only get a symbol (`japaneseCommunityImages`), never a logo.
 */
const MCDONALDS_LOGO = 'https://images.pokemontcg.io/mcd21/logo.png';

interface CommunityImages {
	logo?: string;
	symbol?: string;
}

/**
 * The Japanese set ids Limitless serves a symbol for: modern Japanese cards print the set code in a box, and Limitless serves that box
 * (a 54x31 PNG) at `sets/jp/<id>.png`. It answers 403 for the PMCG, PCG, neo, E, VS and web sets and the promos.
 */
const LIMITLESS_JAPANESE_SETS = new Set(
	'CP1 CP2 M1L M1S M2 M2a M3 M5 M6 M6a MC MF S10a S10P S11 S11a S12 S12a S5I S5R S6H S6K S7D S8 S8b S9 S9a SM10 SM10a SM10b SM11 SM11a SM11b SM12 SM12a SM1M SM1p SM1S SM2K SM2L SM2p SM3H SM3N SM3p SM4A SM4p SM4S SM5M SM5p SM5S SM6 SM6a SM6b SM7 SM7a SM7b SM8 SM8a SM8b SM9 SM9a SM9b SV10 SV11B SV11W SV1a SV1S SV1V SV2a SV2D SV2P SV3 SV3a SV4a SV4K SV4M SV5a SV5K SV5M SV6 SV6a SV7 SV7a SV8 SV8a SV9 SV9a SVK SVLN SVLS WCS23'.split(' '),
);

/** The fallback images of a set: the English table for English and French sets, the Limitless symbol for a Japanese one. */
export function communityImages(lang: string, setId: string): CommunityImages | undefined {
	if (lang !== 'ja') return COMMUNITY_SET_IMAGES[setId];
	return LIMITLESS_JAPANESE_SETS.has(setId) ? {symbol: `https://s3.limitlesstcg.com/sets/jp/${setId}.png`} : undefined;
}

const COMMUNITY_SET_IMAGES: Record<string, CommunityImages> = {
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
	'base1': {symbol: 'https://images.pokemontcg.io/base1/symbol.png'},
	'me05': {symbol: 'https://images.scrydex.com/pokemon/me5-symbol/symbol'},
	'me06': {logo: 'https://images.scrydex.com/pokemon/me6-logo/logo', symbol: 'https://images.scrydex.com/pokemon/me6-symbol/symbol'},
	'sma': {logo: 'https://images.pokemontcg.io/sma/logo.png', symbol: 'https://images.pokemontcg.io/sma/symbol.png'},
	'sv05': {logo: 'https://images.pokemontcg.io/sv5/logo.png', symbol: 'https://images.pokemontcg.io/sv5/symbol.png'},
	'sv07': {symbol: 'https://images.pokemontcg.io/sv7/symbol.png'},
	'sv08': {symbol: 'https://images.pokemontcg.io/sv8/symbol.png'},
	'sv08.5': {symbol: 'https://images.pokemontcg.io/sv8pt5/symbol.png'},
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
