import {CARDTRADER_IMAGES} from '#src/constants.ts';
import {HttpError, mapAll, withRetry} from './tcgdex/client';

/** Workers-safe: plain `fetch` and no Node built-ins, so the CLI and the scraper Worker share it. */

const API = 'https://api.cardtrader.com/api/v2';

/** CardTrader's Pokémon game id, read from `GET /games` (which wraps its array in `{array}`, unlike the docs). */
const POKEMON_GAME = 5;

/** 200 requests per 10 s across every endpoint: one start every 55 ms stays ~10 % under it, ~47 s for the 862 calls. */
const REQUEST_SPACING_MS = 55;

/** Only the lookup the sync needs, so the CLI can hand over a `Map` and the Worker a SQLite-backed reader. */
export type CardTraderImages = Pick<ReadonlyMap<number, {url: string}>, 'get'>;

interface Expansion {
	game_id: number;
	id: number;
}

interface Blueprint {
	card_market_ids: number[] | null;
	image_url: string | null;
}

/** Every blueprint image is `.../image/<blueprint id>/preview_<slug>.<ext>`, served on `cardtrader.com` or `www.cardtrader.com`. The others (user uploads, other paths) are skipped. */
const PREVIEW_URL = /^https:\/\/(?:www\.)?cardtrader\.com\/uploads\/blueprints\/image\/(\d+)\/preview_([^/]+)$/;

class CardTraderClient {
	private next = 0;

	constructor(private readonly token: string) {}

	/** Reserves the next start time before sleeping, so concurrent callers queue up one spacing apart. It stays correct in Workers, where `Date.now()` is frozen within a tick. */
	private async slot(): Promise<void> {
		const now = Date.now();
		const at = Math.max(now, this.next);
		this.next = at + REQUEST_SPACING_MS;
		if (at > now) await new Promise(resolve => setTimeout(resolve, at - now));
	}

	/**
	 * `null` is a 404, which the export answers for an expansion whose blueprints are not ready, new or regenerating ("Data is not ready for blueprints_exp_4927").
	 * The slot sits inside the retried function, so a retry after a 429 or a 5xx waits its turn again.
	 */
	json<T>(path: string): Promise<T | null> {
		return withRetry(async () => {
			await this.slot();
			const response = await fetch(`${API}${path}`, {headers: {accept: 'application/json', authorization: `Bearer ${this.token}`}});
			if (response.status === 404) return null;
			if (!response.ok) throw new HttpError(response.status, path);
			return await response.json() as T;
		});
	}
}

/** The full-size scan under the `www` host with the `preview_` prefix stripped: `show_` (500 px) and the original (868 px) are derived from it at display time. */
function scanUrl(url: string | null): string | undefined {
	const match = url ? PREVIEW_URL.exec(url) : null;
	return match ? `${CARDTRADER_IMAGES}${match[1]}/${match[2]}` : undefined;
}

export interface CardTraderScans {
	/** Expansions whose export answered 404 this time. Their products are absent from `products`, so a store keeps its previous rows for them. */
	notReady: number[];
	/** Cardmarket product id -> scan, with the expansion it came from. */
	products: Map<number, {expansion: number; url: string}>;
}

/**
 * Cardmarket product id -> scan of that exact print, from every Pokémon expansion of CardTrader (~50 s). Unlike TCGdex, it has real Japanese scans.
 * A product shared by several blueprints keeps the first one in expansion id order, so two runs agree.
 */
export async function fetchCardTraderScans(token: string): Promise<CardTraderScans> {
	const client = new CardTraderClient(token);
	const expansions = ((await client.json<Expansion[]>('/expansions')) ?? []).filter(expansion => expansion.game_id === POKEMON_GAME).sort((a, b) => a.id - b.id);
	/** Each response is reduced to its pairs as soon as it arrives, so the parsed blueprints (~100 kB per expansion) are not all alive at once. */
	const answers = await mapAll(expansions, async ({id}) => {
		const blueprints = await client.json<Blueprint[]>(`/blueprints/export?expansion_id=${id}`);
		return {
			expansion: id,
			pairs: blueprints?.flatMap(blueprint => {
				const url = scanUrl(blueprint.image_url);
				return url ? (blueprint.card_market_ids ?? []).map(product => [product, url] as const) : [];
			}),
		};
	});
	const scans: CardTraderScans = {notReady: [], products: new Map()};
	for (const {expansion, pairs} of answers) {
		if (!pairs) scans.notReady.push(expansion);
		else for (const [product, url] of pairs) if (!scans.products.has(product)) scans.products.set(product, {expansion, url});
	}
	/** An empty map means a bad answer, and the Worker would replace yesterday's map with it. */
	if (!scans.products.size) throw new Error('CardTrader returned no Pokémon scan');
	return scans;
}
