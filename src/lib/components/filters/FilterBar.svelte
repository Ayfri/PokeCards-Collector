<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The `TextInput`: first, 224 px from the `sm` breakpoint, which fits "Search Pokémon..." beside the icon. */
		search: Snippet;
		/** The `SortControl`: last, so the sort sits on the right. */
		sort: Snippet;
	}

	let { search, sort }: Props = $props();
</script>

<!-- Search and sort share one row down to a 360 px phone (128 px + 176 px + the gap), and the row wraps below that. Labels on both keep the bar 52 px tall. -->
<div class="flex flex-wrap items-end gap-3">
	<div class="flex-1 sm:w-56 sm:flex-none">{@render search()}</div>
	<div class="flex-1 sm:w-60 sm:flex-none">{@render sort()}</div>
</div>
