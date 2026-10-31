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
