import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from 'cloudflare:workers';
import {createSyncClient, syncSetCards, syncSets} from '$scrapers/supabase_sync';
import {FetchClient} from '$scrapers/tcgdex/client';
import type {Language} from '$scrapers/tcgdex/mappers';

interface Env {
	PUBLIC_SUPABASE_URL: string;
	SCRAPER: Workflow;
	SCRAPER_TRIGGER_TOKEN?: string;
	SUPABASE_SECRET_KEY: string;
}

const LANGUAGES: readonly Language[] = ['en', 'ja'];

/** Sets fetched per step: a step is one Worker invocation, so its subrequests must stay well under the per-invocation cap. */
const SETS_PER_STEP = 4;

/**
 * Weekly TCGdex -> Supabase refresh. One step per set batch, so a failure retries that batch alone
 * instead of the whole catalogue. Unlike the CLI it never deletes rows: a half-finished pass would
 * otherwise drop cards the run had not reached yet.
 */
export class ScrapeWorkflow extends WorkflowEntrypoint<Env> {
	async run(_event: WorkflowEvent<unknown>, step: WorkflowStep): Promise<void> {
		const supabase = createSyncClient(this.env.PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY);
		const client = new FetchClient();

		for (const lang of LANGUAGES) {
			const setIds = await step.do(`${lang}: sets`, () => syncSets(supabase, client, lang));

			for (let index = 0; index < setIds.length; index += SETS_PER_STEP) {
				const batch = setIds.slice(index, index + SETS_PER_STEP);
				await step.do(
					`${lang}: cards ${index / SETS_PER_STEP + 1} (${batch.join(', ')})`,
					{retries: {limit: 5, delay: '30 seconds', backoff: 'exponential'}, timeout: '10 minutes'},
					() => syncSetCards(supabase, client, lang, batch),
				);
			}
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
