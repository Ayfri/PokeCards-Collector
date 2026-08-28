export const TCGDEX_ORIGIN = 'https://api.tcgdex.net';

/** Anything the scraper can pull TCGdex JSON through. `null` means the entity does not exist (404). */
export interface TcgdexClient {
	json<T>(path: string): Promise<T | null>;
	close(): void;
}

/** Generic retry with exponential backoff and jitter. */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 500, log = false): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= maxRetries) throw error;
			const delay = baseDelay * 1.5 ** attempt + Math.random() * baseDelay;
			if (log) console.log(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms: ${(error as Error).message}`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

/** `fetch` client for Workers: their `fetch` already negotiates HTTP/2 to the origin, while Node's and Bun's stay on HTTP/1.1, which is why the CLI keeps the h2 pool. */
export class FetchClient implements TcgdexClient {
	private inflight = 0;
	private readonly queue: (() => void)[] = [];

	constructor(private readonly origin: string = TCGDEX_ORIGIN, private readonly maxConcurrency = 50) {}

	async json<T>(path: string): Promise<T | null> {
		if (this.inflight >= this.maxConcurrency) await new Promise<void>(resolve => this.queue.push(resolve));
		this.inflight++;
		try {
			return await withRetry(async () => {
				const response = await fetch(`${this.origin}${path}`, {headers: {accept: 'application/json'}});
				if (response.status === 404) return null;
				if (!response.ok) throw new Error(`${response.status} on ${path}`);
				return await response.json() as T;
			});
		} finally {
			this.inflight--;
			this.queue.shift()?.();
		}
	}

	close(): void {}
}

/** Runs `worker` over `items` with the client's own back-pressure, reporting progress every `logEvery` items. */
export async function mapAll<T, R>(items: readonly T[], worker: (item: T, index: number) => Promise<R>, label?: string, logEvery = 2000): Promise<R[]> {
	let done = 0;
	return Promise.all(items.map(async (item, index) => {
		const result = await worker(item, index);
		if (label && ++done % logEvery === 0) console.log(`  ${label}: ${done}/${items.length}`);
		return result;
	}));
}
