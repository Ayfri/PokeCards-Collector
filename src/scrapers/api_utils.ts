export const API_BASE_URL = 'https://api.pokemontcg.io/v2';
const apiKey = process.env.POKEMON_TCG_API_KEY;

// Optional: Add a check to ensure the API key is loaded, or throw an error/log a warning.
if (!apiKey) {
	console.warn('Warning: POKEMON_TCG_API_KEY is not set in environment variables.');
	// You might want to throw an error here if the API key is absolutely essential
	// throw new Error('Missing POKEMON_TCG_API_KEY in environment variables.');
}

export const headers = {
	'X-Api-Key': apiKey || '', // Use the loaded API key, or an empty string if not found
};

/**
 * Generic retry function with exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1000, log = true): Promise<T> {
	let attempt = 0;

	while (true) {
		try {
			return await fn();
		} catch (error) {
			attempt++;

			if (attempt > maxRetries) {
				throw error;
			}

			const delay = baseDelay * Math.pow(1.5, attempt) + (Math.random() * baseDelay);
			if (log) {
				console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms...`);
			}
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

/**
 * Fetches data from the Pokemon TCG API with retry mechanism
 */
export async function fetchFromAPI<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
	return withRetry(async () => {
		const queryParams = new URLSearchParams(params).toString();
		const url = `${API_BASE_URL}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

		if (!apiKey) {
			throw new Error('Pokémon TCG API key is missing from .env file, key: POKEMON_TCG_API_KEY');
		}

		const response = await fetch(url, {
			headers: {
				'X-Api-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('429: Rate limit reached');
			}
			throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
		}

		return await response.json() as T;
	}, 5, 1000);
}
