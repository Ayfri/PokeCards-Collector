import { version } from '$app/env';
import { goto, refreshAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { CATALOGUES, type Language } from '#helpers/catalogues.ts';

/** The card page of a catalogue. It lives here and not in `catalogues.ts`, which the scrapers and the Worker bundle and which cannot import `$app/paths`. */
export function cardPath(language: Language, cardCode: string): string {
	const { routeCode } = CATALOGUES[language];
	return routeCode
		? resolve('/[catalogue=catalogue]-card/[cardCode]', { catalogue: routeCode, cardCode })
		: resolve('/card/[cardCode]', { cardCode });
}

/** Reruns every load so the pages see the new session, then leaves the pages that only make sense signed out (`/auth/*`, `/reset-password`). */
export async function finishSignIn(): Promise<void> {
	await refreshAll();
	if (['/auth', '/reset-password'].some(path => page.url.pathname.startsWith(path))) await goto('/');
}

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

/**
 * Fetches `url` as JSON once per session and shares the promise. A failed fetch is dropped so the next navigation retries it.
 * The URL carries the build version: the endpoints send `cache-control: max-age`, so without it a deploy that changes a payload's
 * shape kept serving the old JSON from the browser cache (card.dle sorted on a `setName` the cached suggestions lacked).
 */
export function cachedJson<T>(fetch: typeof globalThis.fetch, url: string): Promise<T> {
	const cached = payloads.get(url) as Promise<T> | undefined;
	if (cached) return cached;

	const versioned = `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
	const payload = fetch(versioned).then(response => {
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
