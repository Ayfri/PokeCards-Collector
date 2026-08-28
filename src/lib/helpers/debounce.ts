export function debounce<TArgs extends readonly unknown[]>(fn: (...args: TArgs) => void, delay: number) {
	let debounceTimeout: number;
	return (...args: TArgs) => {
		clearTimeout(debounceTimeout);
		debounceTimeout = window.setTimeout(() => {
			fn(...args);
		}, delay);
	};
}
