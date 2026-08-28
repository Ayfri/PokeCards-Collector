import { writable } from 'svelte/store';

/** Scroll position of the card grid, 0-100. Fed by VirtualGrid, which computes it from sizes it already tracks. */
export const scrollProgress = writable(0);

export function setScrollProgress(progress: number) {
	scrollProgress.set(progress);
}
