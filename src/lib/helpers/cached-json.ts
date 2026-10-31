const payloads = new Map<string, Promise<unknown>>();

/** Fetches `url` as JSON once per session: the promise is shared, and a failed one is evicted so the next navigation retries. */
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
