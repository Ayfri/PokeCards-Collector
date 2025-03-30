import { writable } from 'svelte/store';

export const scrollProgress = writable(0);

export function updateScrollProgress(container: HTMLElement) {
	if (!container) return;

	const scrollTop = container.scrollTop;
	const scrollHeight = container.scrollHeight;
	const clientHeight = container.clientHeight;

	// Calculate scroll percentage (clamped between 0-100)
	const progress = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight) * 100)));

	// Update the store value
	scrollProgress.set(progress);
}
