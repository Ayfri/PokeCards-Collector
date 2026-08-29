/**
 * jsDelivr mirrors the PokeAPI sprite repo behind a real CDN and serves it with `max-age=604800`;
 * `raw.githubusercontent.com` answers with `max-age=300`, so every visit re-downloaded the whole grid.
 */
const SPRITES_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';

/** 475x475 official artwork, the only rendering that exists for every one of the 1025 species. */
export function getPokemonImageSrc(pokemonId: number): string {
	return `${SPRITES_BASE}/other/official-artwork/${pokemonId}.png`;
}

/** 96x96 game sprite, ~1 kB against ~120 kB for the artwork, used as the last fallback. */
export function getPokemonSpriteSrc(pokemonId: number): string {
	return `${SPRITES_BASE}/${pokemonId}.png`;
}

/**
 * Swaps a failed artwork for `fallbackImage` (a card scan) and then for the small sprite, once each: the
 * marker class stops a broken fallback from looping back into this handler.
 */
export function handlePokemonImageError(event: Event, pokemonId: number, fallbackImage = ''): void {
	const img = event.currentTarget as HTMLImageElement;

	if (img.classList.contains('fallback-attempted')) {
		img.src = '/loading-spinner.svg';
		img.onerror = null;
		return;
	}

	img.classList.add('fallback-attempted');
	img.src = fallbackImage || getPokemonSpriteSrc(pokemonId);
}
