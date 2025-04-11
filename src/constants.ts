import { env } from '$env/dynamic/public';

export const POKEMONS_COUNT = 1025;
export const BASE_URL = 'https://pokestore.ayfri.com';
export const SITE_NAME = 'PokéStore';
export const NO_IMAGES = env.PUBLIC_CARD_CDN_URL === 'NO_IMAGES';
