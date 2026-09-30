import {DurableObject, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from 'cloudflare:workers';
import {createSyncClient, dropSharedProducts, syncSetCards, syncSets, type SyncCardsResult} from '$scrapers/supabase_sync';
import {FetchClient} from '$scrapers/tcgdex/client';
import type {Language} from '$scrapers/tcgdex/mappers';

interface Env {
	PUBLIC_SUPABASE_URL: string;
	SCRAPER: Workflow;
	SCRAPER_TRIGGER_TOKEN?: string;
	SUPABASE_SECRET_KEY: string;
	TCGDEX_READER: DurableObjectNamespace<TcgdexReader>;
}

const LANGUAGES: readonly Language[] = ['en', 'ja'];

/** Sets fetched per step: a step is one Worker invocation, so its subrequests must stay well under the per-invocation cap. */
const SETS_PER_STEP = 4;

/**
 * Runs every TCGdex read from Western Europe. `api.tcgdex.net` is geo-DNS: Europe gets the French origin, North America
 * two Canadian mirrors frozen on the 2026-09-17 build, which list 158 of the 161 30th Celebration cards with no price.
 * Cron-created Workflow instances ran there, and the sync deleted the prices those mirrors no longer had.
 */
export class TcgdexReader extends DurableObject<Env> {
	private readonly supabase = createSyncClient(this.env.PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY);
	private readonly client = new FetchClient();

	syncSets(lang: Language): Promise<string[]> {
		return syncSets(this.supabase, this.client, lang);
	}

	syncSetCards(lang: Language, setIds: string[]): Promise<SyncCardsResult> {
		return syncSetCards(this.supabase, this.client, lang, setIds);
	}
}

/**
 * Daily TCGdex -> Supabase refresh. One step per set batch, so a failure retries that batch alone
 * instead of the whole catalogue. Every delete is scoped to a set TCGdex just answered for (a card it dropped, a price
 * it lost, a set it holds no card for), so a half-finished pass never removes rows it has not reached yet.
 */
export class ScrapeWorkflow extends WorkflowEntrypoint<Env> {
	async run(_event: WorkflowEvent<unknown>, step: WorkflowStep): Promise<void> {
		const supabase = createSyncClient(this.env.PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY);
		/** A location hint only applies when the object is first created, so the fixed name keeps it in Western Europe for good. */
		const reader = this.env.TCGDEX_READER.get(this.env.TCGDEX_READER.idFromName('weur'), {locationHint: 'weur'});

		for (const lang of LANGUAGES) {
			const setIds = await step.do(`${lang}: sets`, () => reader.syncSets(lang));

			for (let index = 0; index < setIds.length; index += SETS_PER_STEP) {
				const batch = setIds.slice(index, index + SETS_PER_STEP);
				await step.do(
					`${lang}: cards ${index / SETS_PER_STEP + 1} (${batch.join(', ')})`,
					{retries: {limit: 5, delay: '30 seconds', backoff: 'exponential'}, timeout: '10 minutes'},
					async (): Promise<SyncCardsResult> => reader.syncSetCards(lang, batch),
				);
			}

			await step.do(`${lang}: shared products`, () => dropSharedProducts(supabase, lang));
		}
	}
}

/** Manual kick-off: `POST /run` with `Authorization: Bearer $SCRAPER_TRIGGER_TOKEN`. `GET /?id=` reports an instance. */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/run') {
			const token = env.SCRAPER_TRIGGER_TOKEN;
			if (!token || request.headers.get('authorization') !== `Bearer ${token}`) return new Response('Unauthorized', {status: 401});
			const instance = await env.SCRAPER.create();
			return Response.json({id: instance.id, status: await instance.status()});
		}

		const id = url.searchParams.get('id');
		if (!id) return new Response('POST /run to start a scrape, GET /?id=<instance> to follow one', {status: 404});
		const instance = await env.SCRAPER.get(id);
		return Response.json(await instance.status());
	},
} satisfies ExportedHandler<Env>;
