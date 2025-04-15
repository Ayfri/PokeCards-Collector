
let env: Record<string, string | undefined> = {};
try {
	env = (await import('$env/dynamic/public')).env;
} catch (error) {
	env = import.meta.env ?? process.env;
}

export const POKEMONS_COUNT = 1025;
export const BASE_URL = 'https://pokestore.ayfri.com';
export const SITE_NAME = 'PokéStore';
export const NO_IMAGES = env.PUBLIC_CARD_CDN_URL === 'NO_IMAGES';
