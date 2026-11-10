/** Folder of `static/` holding the mirror of the set logos and symbols. */
export const SET_IMAGE_DIR = 'set-images';

/** The image hosts the sets point at, each with the folder of its files in the mirror. */
const SET_IMAGE_HOSTS: Record<string, string> = {
	'assets.tcgdex.net': 'tcgdex',
	'images.pokemontcg.io': 'pokemontcg',
	'images.scrydex.com': 'scrydex',
	's3.limitlesstcg.com': 'limitless',
};

/**
 * The mirrored path of a set image URL, or `undefined` for a host or a path the mirror does not hold. The path derives from the URL alone
 * (extension dropped, so a TCGdex `.png` and its `.webp` twin share one file; case kept, Limitless ids like `SV1a` are case-sensitive),
 * so no manifest is needed: the server checks it against the build's static assets before using it.
 */
export function mirrorPath(url: string): string | undefined {
	const {hostname, pathname} = new URL(url);
	const folder = SET_IMAGE_HOSTS[hostname];
	const path = pathname.replace(/\.(png|webp|jpe?g)$/i, '');
	if (!folder || !/^[A-Za-z0-9._/-]+$/.test(path)) return undefined;
	return `/${SET_IMAGE_DIR}/${folder}${path}.webp`;
}
