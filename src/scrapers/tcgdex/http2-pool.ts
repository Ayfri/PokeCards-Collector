import http2 from 'node:http2';
import {gunzipSync, inflateSync} from 'node:zlib';
import {withRetry, type TcgdexClient} from './client';

const API_ORIGIN = 'https://api.tcgdex.net';

/**
 * HTTP/2 client pool for the scraper CLI. The API caps concurrent streams per connection, so a handful
 * of connections round-robined beats both a single h2 session and Node's HTTP/1.1 `fetch` pool
 * (~1720 req/s against ~990). Workers only ship `node:http2` stubs behind `enable_nodejs_http2_module`
 * and no outbound h2 client, so server code uses `FetchClient` - where `fetch` already speaks HTTP/2.
 */
export class Http2Pool implements TcgdexClient {
	private readonly sessions: (http2.ClientHttp2Session | null)[];
	private cursor = 0;
	private inflight = 0;
	private readonly queue: (() => void)[] = [];

	constructor(
		private readonly origin: string = API_ORIGIN,
		readonly connections: number = 4,
		readonly maxConcurrency: number = 100,
	) {
		this.sessions = Array.from({length: connections}, () => null);
	}

	private session(index: number): http2.ClientHttp2Session {
		const existing = this.sessions[index];
		if (existing && !existing.closed && !existing.destroyed) return existing;

		const session = http2.connect(this.origin, {settings: {enablePush: false}});
		session.setMaxListeners(0);
		session.on('error', () => { this.sessions[index] = null; });
		session.on('close', () => { if (this.sessions[index] === session) this.sessions[index] = null; });
		this.sessions[index] = session;
		return session;
	}

	private async acquire(): Promise<void> {
		if (this.inflight < this.maxConcurrency * this.connections) {
			this.inflight++;
			return;
		}
		await new Promise<void>(resolve => this.queue.push(resolve));
		this.inflight++;
	}

	private release(): void {
		this.inflight--;
		this.queue.shift()?.();
	}

	/** Single request without retry. Resolves `null` on 404 so callers can skip missing entities. */
	private request(path: string, method: string, body?: string): Promise<string | null> {
		return new Promise((resolve, reject) => {
			const index = this.cursor++ % this.connections;
			const headers: http2.OutgoingHttpHeaders = {
				':method': method,
				':path': path,
				'accept': 'application/json',
				'accept-encoding': 'gzip, deflate',
				'user-agent': 'pokestore-scraper',
			};
			if (body !== undefined) {
				headers['content-type'] = 'application/json';
				headers['content-length'] = Buffer.byteLength(body);
			}

			const stream = this.session(index).request(headers);
			stream.setTimeout(30_000, () => stream.destroy(new Error(`Timeout on ${path}`)));

			let status = 0;
			let encoding = '';
			stream.on('response', responseHeaders => {
				status = Number(responseHeaders[':status']);
				encoding = String(responseHeaders['content-encoding'] ?? '');
			});

			const chunks: Buffer[] = [];
			stream.on('data', (chunk: Buffer) => chunks.push(chunk));
			stream.on('error', reject);
			stream.on('end', () => {
				if (status === 404) return resolve(null);
				const raw = Buffer.concat(chunks);
				if (status < 200 || status >= 300) return reject(new Error(`${status} on ${path}`));
				try {
					resolve(decode(raw, encoding));
				} catch (error) {
					reject(error);
				}
			});

			if (body !== undefined) stream.end(body);
			else stream.end();
		});
	}

	async json<T>(path: string, method = 'GET', body?: unknown): Promise<T | null> {
		await this.acquire();
		try {
			const payload = body === undefined ? undefined : JSON.stringify(body);
			const text = await withRetry(() => this.request(path, method, payload));
			return text === null ? null : JSON.parse(text) as T;
		} finally {
			this.release();
		}
	}

	/** GraphQL is English-only and does not expose pricing; use it for bulk EN metadata only. */
	async graphql<T>(query: string): Promise<T> {
		const response = await this.json<{data: T; errors?: {message: string}[]}>('/v2/graphql', 'POST', {query});
		if (!response) throw new Error('GraphQL endpoint returned 404');
		if (response.errors?.length) throw new Error(`GraphQL: ${response.errors.map(e => e.message).join('; ')}`);
		return response.data;
	}

	close(): void {
		for (const session of this.sessions) session?.close();
	}
}

function decode(raw: Buffer, encoding: string): string {
	if (encoding === 'gzip') return gunzipSync(raw).toString('utf8');
	if (encoding === 'deflate') return inflateSync(raw).toString('utf8');
	return raw.toString('utf8');
}
