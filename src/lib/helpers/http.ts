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
