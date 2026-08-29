<script lang="ts">
	import { CARD_SIZES, cardSize } from '$stores/grid.svelte';
	import Grid2x2Icon from '@lucide/svelte/icons/grid-2x2';

	/** Presets ordered from the narrowest card to the widest, whatever order the record declares them in. */
	const presets = Object.entries(CARD_SIZES)
		.map(([size, preset]) => ({ ...preset, size: parseFloat(size) }))
		.sort((a, b) => a.width - b.width);

	let isUpdating = $state(false);
	let updateTimeout: number;

	/** Debounced so dragging across the presets relayouts the grid once, with a spinner while the change is pending. */
	function setSize(size: number) {
		if (size === cardSize.current) return;

		isUpdating = true;
		clearTimeout(updateTimeout);
		updateTimeout = window.setTimeout(() => {
			cardSize.current = size;
			isUpdating = false;
		}, 150);
	}
</script>

<div class="flex items-center gap-3 px-1">
	<div class="flex items-center relative gap-1 bg-gray-700 rounded-full p-0.5">
		{#each presets as { name, size } (size)}
			<button
				type="button"
				onclick={() => setSize(size)}
				class={['relative z-10 w-6 h-6 rounded-full transition-colors duration-150 flex items-center justify-center', cardSize.current === size ? 'bg-gold-400 text-black' : 'text-gray-400 hover:bg-gray-600']}
				aria-label={`Set grid size to ${name}`}
				aria-pressed={cardSize.current === size}
				title={`Set grid size to ${name}`}
			>
				<span class="text-xs font-medium">{name}</span>
			</button>
		{/each}
	</div>

	<div class="flex items-center relative">
		<div class="text-white/80 flex items-center" title="Card size in the grid">
			<Grid2x2Icon size={18} />
		</div>
		{#if isUpdating}
			<div class="absolute -right-5 -top-1">
				<div class="animate-spin h-4 w-4 border-2 border-gold-400 rounded-full border-t-transparent"></div>
			</div>
		{/if}
	</div>
</div>
