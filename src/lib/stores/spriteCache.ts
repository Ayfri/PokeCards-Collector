type SpriteCache = Map<number, string>;

class SpriteCacheManager {
	private cache: SpriteCache;
	private pendingRequests: Map<number, Promise<string>>;
	private static instance: SpriteCacheManager;
	private failedIds: Set<number>;

	private constructor() {
		this.cache = new Map();
		this.pendingRequests = new Map();
		this.failedIds = new Set();
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

		// If this ID previously failed, return fallback immediately
		if (this.failedIds.has(pokemonId)) {
			return `/sprites/${pokemonId}.png`;
		}

		// If there's a pending request for this ID, return that promise
		if (this.pendingRequests.has(pokemonId)) {
			return this.pendingRequests.get(pokemonId) as Promise<string>;
		}

		// Create a new request
		const fetchPromise = this.fetchSprite(pokemonId);
		this.pendingRequests.set(pokemonId, fetchPromise);

		try {
			const spriteUrl = await fetchPromise;
			// Request completed, remove from pending
			this.pendingRequests.delete(pokemonId);
			return spriteUrl;
		} catch (error) {
			// Request failed, remove from pending
			this.pendingRequests.delete(pokemonId);
			throw error;
		}
	}

	private async fetchSprite(pokemonId: number): Promise<string> {
		try {
			// Add timeout to prevent hanging requests
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			// Fetch from PokeAPI if not in cache
			const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, {
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`Failed to fetch Pokemon #${pokemonId}: ${response.status}`);
			}

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
			// Mark this ID as failed to avoid retrying
			this.failedIds.add(pokemonId);
			return `/sprites/${pokemonId}.png`;
		}
	}

	// Method to clear cache if needed
	public clearCache(): void {
		this.cache.clear();
		this.failedIds.clear();
	}
}

// Export a singleton instance
export const spriteCache = SpriteCacheManager.getInstance();
