<script lang="ts">
	import { cardSize, sizes } from '$lib/stores/gridStore';
	import Grid2x2Icon from 'lucide-svelte/icons/grid-2x2';
	import { writable } from 'svelte/store';

	// Local state to track if the size is being updated (for visual feedback)
	const isUpdating = writable(false);
	let updateTimeout: number;

	function setSize(newSize: number) {
		if (newSize === $cardSize) return; // Avoid unnecessary updates

		$isUpdating = true;
		clearTimeout(updateTimeout);

		// Debounce the update to avoid flickering and ensure smooth transitions
		updateTimeout = window.setTimeout(() => {
			$cardSize = newSize;
			$isUpdating = false;
		}, 150); // Debounce time
	}
</script>

<div class="grid-size-slider flex items-center gap-3 px-1">
	<div class="flex items-center relative gap-1 bg-gray-700 rounded-full p-0.5">
		{#each Object.entries(sizes).sort((a, b) => a[1].width - b[1].width) as [key, {name, width}]}
            {@const index = parseFloat(key)}
			<button
				type="button"
				on:click={() => setSize(index)}
				class="relative z-10 w-6 h-6 rounded-full transition-colors duration-150 flex items-center justify-center"
				class:bg-gold-400={$cardSize === index}
				class:text-black={$cardSize === index}
				class:text-gray-400={$cardSize !== index}
				class:hover:bg-gray-600={$cardSize !== index}
				aria-label={`Set grid size to {name}`}
				aria-pressed={$cardSize === index}
			>
				<span class="text-xs font-medium">{name}</span>
			</button>
		{/each}
	</div>

	<div class="flex items-center relative">
		<div class="text-white/80 flex items-center">
			<Grid2x2Icon size={18} />
		</div>
		{#if $isUpdating}
			<div class="absolute -right-5 -top-1">
				<div
					class="animate-spin h-4 w-4 border-2 border-gold-400 rounded-full border-t-transparent"
				></div>
			</div>
		{/if}
	</div>
</div> 