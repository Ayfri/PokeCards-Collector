import { writable } from 'svelte/store';

export const loadingStore = writable<boolean>(false);
export const navigationLoadingStore = writable<boolean>(false);

export function setLoading(isLoading: boolean) {
	loadingStore.set(isLoading);
}

export function setNavigationLoading(isLoading: boolean) {
	navigationLoadingStore.set(isLoading);
} 