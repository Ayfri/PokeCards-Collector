import {env} from "$env/dynamic/public";

/** Dev switch: renders placeholders instead of card art so a local run costs no bandwidth. */
export const NO_IMAGES = env.PUBLIC_NO_IMAGES === 'true';
