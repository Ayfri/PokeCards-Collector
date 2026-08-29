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
