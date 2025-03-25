type SpriteCache = Map<number, string>;

class SpriteCacheManager {
	private cache: SpriteCache;
	private static instance: SpriteCacheManager;

	private constructor() {
		this.cache = new Map();
	}

	public static getInstance(): SpriteCacheManager {
		if (!SpriteCacheManager.instance) {
			SpriteCacheManager.instance = new SpriteCacheManager();
		}
		return SpriteCacheManager.instance;
	}

	public async getSprite(pokemonId: number): Promise<string> {
		// Check cache first
		const cached = this.cache.get(pokemonId);
		if (cached) return cached;

		try {
			// Fetch from PokeAPI if not in cache
			const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
			const data = await response.json();

			// Get official artwork or fallback to sprite
			const spriteUrl = data.sprites.other['official-artwork']?.front_default ||
				data.sprites.front_default ||
				`/sprites/${pokemonId}.png`;

			// Add to cache
			this.cache.set(pokemonId, spriteUrl);

			return spriteUrl;
		} catch (error) {
			console.error(`Failed to fetch sprite for Pokemon #${pokemonId}:`, error);
			return `/sprites/${pokemonId}.png`;
		}
	}
}

// Export a singleton instance
export const spriteCache = SpriteCacheManager.getInstance();
