<script lang="ts">
	import { loadingStore, navigationLoadingStore } from '$lib/stores/loading';
	import { fade } from 'svelte/transition';

	// Either a card mutation or a navigation is in flight.
	const isLoading = $derived($loadingStore || $navigationLoadingStore);
</script>

{#if isLoading}
	<div
		class="fixed top-0 left-0 w-full h-2 z-9999"
		in:fade={{ duration: 100 }}
		out:fade={{ duration: 200 }}
	>
		<div class="h-full w-full bg-linear-to-r from-gray-800 via-gold-400 to-gray-800 bg-[length:200%_100%] animate-loading-sweep"></div>
	</div>
{/if}
