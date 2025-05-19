export function debounce(fn: Function, delay: number) {
	let debounceTimeout: number;
	return (...args: any[]) => {
		clearTimeout(debounceTimeout);
		debounceTimeout = window.setTimeout(() => {
			fn(...args);
		}, delay);
	};
} 