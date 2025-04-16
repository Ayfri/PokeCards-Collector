import {env} from "$env/dynamic/public";

export const NO_IMAGES = env.PUBLIC_CARD_CDN_URL === 'NO_IMAGES';
