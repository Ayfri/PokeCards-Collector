import {COMMUNITY_SET_IMAGES} from './community-images';
import type {TcgdexSet} from './types';

export const TCGDEX_ORIGIN = 'https://api.tcgdex.net';
const TCGDEX_ASSETS = 'https://assets.tcgdex.net';

/** Every set is probed at once, so an image host may reset a connection: that is retried, only an answered non-2xx means missing. */
const exists = (url: string) => withRetry(async () => (await fetch(url, {method: 'HEAD'})).ok, 3, 200).catch(() => false);

/** A TCGdex base in both formats, PNG first since the stored logo also feeds Open Graph and the sitemap. */
const formats = (base: string | undefined) => base ? [`${base}.png`, `${base}.webp`] : [];

async function firstExisting(urls: (string | undefined)[]): Promise<string | undefined> {
	for (const url of new Set(urls.filter(url => url !== undefined))) if (await exists(url)) return url;
}

/**
 * Resolves the set logo and symbol to files the CDN actually holds, so the app never requests a missing one.
 * The API links every symbol under `univ/`, which the CDN answers 400 for (InvalidBucketName) while the same file sits under
 * each language, and English covers a language that lacks one. It also links logos it never uploaded and leaves out some it did.
 * An English set TCGdex has nothing for falls back to its community image from `community-images.ts`.
 * `logo` and `symbol` come back as full URLs of files that exist, or undefined.
 */
export async function withProbedAssets(set: TcgdexSet, lang: string): Promise<TcgdexSet> {
	const at = (language: string, file: string) => set.serie && `${TCGDEX_ASSETS}/${language}/${set.serie.id}/${set.id}/${file}`;
	const community = lang === 'en' ? COMMUNITY_SET_IMAGES[set.id] : undefined;
	const [logo, symbol] = await Promise.all([
		firstExisting([...formats(set.logo), ...formats(at(lang, 'logo')), community?.logo]),
		firstExisting([
			...formats(set.symbol?.replace('/univ/', `/${lang}/`)),
			...formats(at(lang, 'symbol')),
			...formats(at('en', 'symbol')),
			community?.symbol,
		]),
	]);
	return {...set, logo, symbol};
}

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
