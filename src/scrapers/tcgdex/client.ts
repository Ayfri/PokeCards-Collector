import {COMMUNITY_SET_IMAGES} from './community-images';
import {jpTwinOf, type Language} from './mappers';
import type {TcgdexCard, TcgdexCardBrief, TcgdexSet} from './types';

export const TCGDEX_ORIGIN = 'https://api.tcgdex.net';
const TCGDEX_ASSETS = 'https://assets.tcgdex.net';

/** All sets are probed at once, so the image host may reset a connection. Resets are retried, and only an answered non-2xx means the file is missing. */
const exists = (url: string) => withRetry(async () => (await fetch(url, {method: 'HEAD'})).ok, 3, 200).catch(() => false);

/** A TCGdex base URL in both formats, PNG first because the stored logo also feeds Open Graph and the sitemap. */
const formats = (base: string | undefined) => base ? [`${base}.png`, `${base}.webp`] : [];

async function firstExisting(urls: (string | undefined)[]): Promise<string | undefined> {
	for (const url of new Set(urls.filter(url => url !== undefined))) if (await exists(url)) return url;
}

/**
 * Resolves the set logo and symbol to files the CDN actually holds, so the app never requests a missing one.
 * The API links every symbol under `univ/`, which the CDN answers 400 for (InvalidBucketName), while the same file sits
 * under each language, and English covers a language that lacks one. It also links logos it never uploaded and leaves
 * out some it did.
 * An English or French set that TCGdex has nothing for falls back to its community image from `community-images.ts`
 * (French set ids are the English ones), and a French logo falls back to the English one.
 * `logo` and `symbol` are full URLs of files that exist, or undefined.
 */
export async function withProbedAssets(set: TcgdexSet, lang: string): Promise<TcgdexSet> {
	const at = (language: string, file: string) => set.serie && `${TCGDEX_ASSETS}/${language}/${set.serie.id}/${set.id}/${file}`;
	const community = lang === 'ja' ? undefined : COMMUNITY_SET_IMAGES[set.id];
	const [logo, symbol] = await Promise.all([
		firstExisting([...formats(set.logo), ...formats(at(lang, 'logo')), ...(lang === 'fr' ? formats(at('en', 'logo')) : []), community?.logo]),
		firstExisting([
			...formats(set.symbol?.replace('/univ/', `/${lang}/`)),
			...formats(at(lang, 'symbol')),
			...formats(at('en', 'symbol')),
			community?.symbol,
		]),
	]);
	return {...set, logo, symbol};
}

/** Anything the scraper can read TCGdex JSON through. `null` means the entity does not exist (404). */
export interface TcgdexClient {
	json<T>(path: string): Promise<T | null>;
	close(): void;
}

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

/** `fetch` client for Workers: their `fetch` already negotiates HTTP/2 to the origin, while Node's and Bun's stay on HTTP/1.1, so the CLI keeps the h2 pool. */
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

/**
 * Card id -> English image base for the cards of the given sets that have no image in their own language. Many French sets
 * have no scan at all (every `dp*` set), so the English card with the same id stands in. A set missing from the English catalogue adds nothing.
 */
export async function englishImages(client: TcgdexClient, sets: readonly (TcgdexSet | null)[]): Promise<Map<string, string>> {
	const imageless = sets.filter(set => set?.cards?.some(card => !card.image));
	const english = await mapAll(imageless, set => client.json<TcgdexSet>(`/v2/en/sets/${encodeURIComponent(set!.id)}`));
	return new Map(english.flatMap(set => set?.cards?.flatMap(card => card.image ? [[card.id, card.image] as const] : []) ?? []));
}

/**
 * Card id -> English image base for the cards of the given sets that have no scan of their own: a French card takes the English card
 * with the same id (`englishImages`), a Japanese card the English twin from `jp-twins.json`. Twin scans come from the one `/v2/en/cards`
 * list (2.4 MB, fetched only when a card needs it) rather than a request per twin, which would eat into a Worker step's subrequest cap.
 */
export async function imageFallbacks(client: TcgdexClient, lang: Language, sets: readonly (TcgdexSet | null)[]): Promise<Map<string, string>> {
	if (lang === 'fr') return englishImages(client, sets);
	const twinOf = new Map(lang === 'ja' ? sets.flatMap(set => set?.cards?.flatMap(card => {
		const twin = card.image ? undefined : jpTwinOf(card.id);
		return twin ? [[card.id, twin.en] as const] : [];
	}) ?? []) : []);
	if (!twinOf.size) return new Map();
	const english = new Map((await client.json<TcgdexCardBrief[]>('/v2/en/cards'))?.flatMap(card => card.image ? [[card.id, card.image] as const] : []));
	return new Map([...twinOf].flatMap(([id, twin]) => english.has(twin) ? [[id, english.get(twin)!] as const] : []));
}

/**
 * French only: TCGdex France lists the Arceus `pl4-AR*` cards under `pl3` and has no `pl4` set, so each card is filed under the set that lists it.
 * The English and Japanese catalogues list no such card, and re-filing one there would create a second row with the same `tcgdex_id`.
 */
export function fileUnderListingSets(cards: readonly (TcgdexCard | null)[], sets: readonly (TcgdexSet | null)[]): void {
	const listing = new Map(sets.flatMap(set => set?.cards?.map(brief => [brief.id, set] as const) ?? []));
	for (const card of cards) {
		const set = card && listing.get(card.id);
		if (set && card.set?.id !== set.id) card.set = {...card.set, id: set.id, name: set.name};
	}
}

/** Runs `worker` over every item at once, relying on the client's own queue for back-pressure, and logs progress every `logEvery` items. */
export async function mapAll<T, R>(items: readonly T[], worker: (item: T, index: number) => Promise<R>, label?: string, logEvery = 2000): Promise<R[]> {
	let done = 0;
	return Promise.all(items.map(async (item, index) => {
		const result = await worker(item, index);
		if (label && ++done % logEvery === 0) console.log(`  ${label}: ${done}/${items.length}`);
		return result;
	}));
}
