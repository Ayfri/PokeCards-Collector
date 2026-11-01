/** Parses a JSON response body as `T`, falling back to `fallback` when the body is absent or malformed. */
export async function readJson<T>(response: Response, fallback: T): Promise<T> {
	try {
		return (await response.json()) as T;
	} catch {
		return fallback;
	}
}

/** Shape returned by the app's API routes when a request fails. */
export interface ApiError {
	message?: string;
	error?: string;
}

const payloads = new Map<string, Promise<unknown>>();

/** Fetches `url` as JSON once per session and shares the promise. A failed fetch is dropped so the next navigation retries it. */
export function cachedJson<T>(fetch: typeof globalThis.fetch, url: string): Promise<T> {
	const cached = payloads.get(url) as Promise<T> | undefined;
	if (cached) return cached;

	const payload = fetch(url).then(response => {
		if (!response.ok) throw new Error(`${url} answered ${response.status}`);
		return response.json() as Promise<T>;
	});
	payload.catch(() => payloads.delete(url));
	payloads.set(url, payload);
	return payload;
}

export function debounce<TArgs extends readonly unknown[]>(fn: (...args: TArgs) => void, delay: number) {
	let debounceTimeout: number;
	return (...args: TArgs) => {
		clearTimeout(debounceTimeout);
		debounceTimeout = window.setTimeout(() => {
			fn(...args);
		}, delay);
	};
}

/** Runs `fn` at most once per `delay` ms, dropping the calls in between. */
export function throttle<TArgs extends readonly unknown[]>(fn: (...args: TArgs) => void, delay: number) {
	let canRun = true;
	return (...args: TArgs) => {
		if (!canRun) return;
		fn(...args);
		canRun = false;
		window.setTimeout(() => {
			canRun = true;
		}, delay);
	};
}
