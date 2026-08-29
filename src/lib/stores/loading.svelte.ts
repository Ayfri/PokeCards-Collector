/** Drives the top loading bar: a card mutation and a navigation can be in flight at the same time. */
class Loading {
	mutation = $state(false);
	navigation = $state(false);

	readonly active = $derived(this.mutation || this.navigation);
}

export const loading = new Loading();
