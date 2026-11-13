import {DurableObject, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from 'cloudflare:workers';
import {type Language, LANGUAGES} from '#helpers/catalogues.ts';
import {type CardTraderImages, fetchCardTraderScans} from '#scrapers/cardtrader.ts';
import {publishCatalogue} from '#scrapers/publish.ts';
import {createSyncClient, dropSharedProducts, type SyncCardsResult, syncSetCards, syncSets} from '#scrapers/supabase-sync.ts';
import {FetchClient} from '#scrapers/tcgdex/client.ts';

interface Env {
	CARDTRADER_TOKEN?: string;
	CATALOGUE: R2Bucket;
	PUBLIC_SUPABASE_URL: string;
	SCRAPER: Workflow;
	SCRAPER_TRIGGER_TOKEN?: string;
	SUPABASE_SECRET_KEY: string;
	TCGDEX_READER: DurableObjectNamespace<TcgdexReader>;
}

/** Sets fetched per step. A step is one Worker invocation, so its subrequests must stay well under the per-invocation cap. */
const SETS_PER_STEP = 4;

/**
 * Runs every TCGdex read from Western Europe. `api.tcgdex.net` is geo-DNS: Europe gets the French origin, North America
 * gets two Canadian mirrors frozen on the 2026-09-17 build, which list 158 of the 161 30th Celebration cards with no price.
 * Workflow instances created by the cron ran in North America, so the sync deleted the prices those mirrors lacked.
 */
export class TcgdexReader extends DurableObject<Env> {
	private readonly supabase = createSyncClient(this.env.PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY);
	private readonly client = new FetchClient();
	/** Reads the map `syncCardTraderImages` stored, so the batch steps that run in this object hold no ~68k-entry map in memory. */
	private readonly cardTrader: CardTraderImages = {
		get: product => this.ctx.storage.sql.exec<{url: string}>('SELECT url FROM cardtrader_images WHERE product = ?', product).toArray()[0],
	};

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS cardtrader_images (product INTEGER PRIMARY KEY, expansion INTEGER NOT NULL, url TEXT NOT NULL)');
	}

	/**
	 * Rebuilds the table in one transaction and returns its row count. The rows of an expansion whose export is not ready (404) are kept.
	 * A missing token or a CardTrader failure keeps the stored rows and logs the error when there are some, so the cards keep their scans.
	 * An empty table has nothing to fall back on, and syncing without it would null every CardTrader scan, so that case throws and the step fails.
	 */
	async syncCardTraderImages(): Promise<number> {
		const count = () => this.ctx.storage.sql.exec<{count: number}>('SELECT COUNT(*) AS count FROM cardtrader_images').one().count;
		try {
			const token = this.env.CARDTRADER_TOKEN;
			if (!token) throw new Error('CARDTRADER_TOKEN is not set');
			const {notReady, products} = await fetchCardTraderScans(token);
			this.ctx.storage.transactionSync(() => {
				this.ctx.storage.sql.exec('DELETE FROM cardtrader_images WHERE expansion NOT IN (SELECT value FROM json_each(?))', JSON.stringify(notReady));
				for (const [product, {expansion, url}] of products) {
					this.ctx.storage.sql.exec('INSERT OR REPLACE INTO cardtrader_images (product, expansion, url) VALUES (?, ?, ?)', product, expansion, url);
				}
			});
		} catch (error) {
			if (!count()) throw error;
			console.error(`CardTrader images failed, the sync uses the ${count()} stored rows:`, error);
		}
		return count();
	}

	syncSets(lang: Language): Promise<string[]> {
		return syncSets(this.supabase, this.client, lang);
	}

	syncSetCards(lang: Language, setIds: string[]): Promise<SyncCardsResult> {
		return syncSetCards(this.supabase, this.client, lang, setIds, this.cardTrader);
	}
}

/**
 * Daily TCGdex -> Supabase refresh. One step per set batch, so a failure retries that batch alone, not the whole
 * catalogue. Every delete is scoped to a set TCGdex just answered for (a card it dropped, a price it lost, a set it
 * holds no card for), so a half-finished pass never removes rows it has not reached yet. The last step publishes the tables to R2, where the site reads them.
 */
export class ScrapeWorkflow extends WorkflowEntrypoint<Env> {
	async run(_event: WorkflowEvent<unknown>, step: WorkflowStep): Promise<void> {
		const supabase = createSyncClient(this.env.PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY);
		/** Cloudflare honours a location hint only when the object is first created, and only on a best-effort basis, so the fixed name `weur` reuses that one object. */
		const reader = this.env.TCGDEX_READER.get(this.env.TCGDEX_READER.idFromName('weur'), {locationHint: 'weur'});

		/** Not caught on purpose: the RPC only throws when no map is stored, and the batch steps would then null every CardTrader scan. */
		await step.do('cardtrader: images', {retries: {backoff: 'exponential', delay: '1 minute', limit: 2}, timeout: '10 minutes'}, () => reader.syncCardTraderImages());

		/**
		 * The database is the source of truth, so a failed language still publishes what its batches already wrote.
		 * A failure stops the languages after it, and the error still ends the run once the publish step is done.
		 */
		let failure: unknown;
		try {
			for (const lang of LANGUAGES) {
				const setIds = await step.do(`${lang}: sets`, () => reader.syncSets(lang));

				for (let index = 0; index < setIds.length; index += SETS_PER_STEP) {
					const batch = setIds.slice(index, index + SETS_PER_STEP);
					await step.do(
						`${lang}: cards ${index / SETS_PER_STEP + 1} (${batch.join(', ')})`,
						{retries: {backoff: 'exponential', delay: '30 seconds', limit: 5}, timeout: '10 minutes'},
						async (): Promise<SyncCardsResult> => reader.syncSetCards(lang, batch),
					);
				}

				await step.do(`${lang}: shared products`, () => dropSharedProducts(supabase, lang));
			}
		} catch (error) {
			console.error('A language failed, the publish step still runs:', error);
			failure = error;
		}

		await step.do('publish', {retries: {backoff: 'exponential', delay: '1 minute', limit: 2}, timeout: '10 minutes'}, () => publishCatalogue(supabase, this.env.CATALOGUE));
		if (failure) throw failure;
	}
}

/** `timingSafeEqual` is a Workers extension that the DOM typings the project is checked against do not declare. */
type WorkersSubtle = SubtleCrypto & {timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean};

/** `timingSafeEqual` throws on buffers of different lengths, so the length is compared first: a wrong length leaks nothing the header does not already show. */
function authorized(request: Request, env: Env): boolean {
	if (!env.SCRAPER_TRIGGER_TOKEN) return false;

	const encoder = new TextEncoder();
	const given = encoder.encode(request.headers.get('authorization') ?? '');
	const expected = encoder.encode(`Bearer ${env.SCRAPER_TRIGGER_TOKEN}`);
	return given.byteLength === expected.byteLength && (crypto.subtle as WorkersSubtle).timingSafeEqual(given, expected);
}

/**
 * Manual kick-off, both with `Authorization: Bearer $SCRAPER_TRIGGER_TOKEN`: `POST /run` starts a scrape, `POST /publish` publishes the
 * catalogue snapshots now and answers with their summary. `GET /?id=` reports an instance.
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/run') {
			if (!authorized(request, env)) return new Response('Unauthorized', {status: 401});
			const instance = await env.SCRAPER.create();
			return Response.json({id: instance.id, status: await instance.status()});
		}

		if (request.method === 'POST' && url.pathname === '/publish') {
			if (!authorized(request, env)) return new Response('Unauthorized', {status: 401});
			try {
				return Response.json(await publishCatalogue(createSyncClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY), env.CATALOGUE));
			} catch (error) {
				console.error('publish failed:', error);
				return Response.json({error: error instanceof Error ? error.message : String(error)}, {status: 500});
			}
		}

		const id = url.searchParams.get('id');
		if (!id) return new Response('POST /run to start a scrape, POST /publish to publish the snapshots, GET /?id=<instance> to follow one', {status: 404});
		const instance = await env.SCRAPER.get(id);
		return Response.json(await instance.status());
	},
} satisfies ExportedHandler<Env>;
