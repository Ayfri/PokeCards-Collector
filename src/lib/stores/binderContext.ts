import { createContext } from 'svelte';
import type { Writable } from 'svelte/store';

/** Card codes sitting in the binder page's storage row. Set by /binder, read by SearchBar so a searched card drops straight into it. */
export const [getBinderStorage, setBinderStorage, hasBinderStorage] = createContext<Writable<string[]>>();
