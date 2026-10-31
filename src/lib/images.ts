import {PUBLIC_NO_IMAGES} from '$app/env/public';

/** Dev switch: renders placeholders instead of card art so a local run costs no bandwidth. */
export const NO_IMAGES = PUBLIC_NO_IMAGES === 'true';
