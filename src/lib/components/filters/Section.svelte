<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';

	export let title: string;
	export let isOpen: boolean;

	// Generate a unique ID for ARIA attributes
	const panelId = `section-panel-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="mb-2">
	<button
		type="button"
		class="flex justify-between items-center w-full px-4 py-2 cursor-pointer bg-black/30 hover:bg-black/40 rounded-md border border-white/10 {isOpen ? 'rounded-b-none' : ''}"
		on:click={() => (isOpen = !isOpen)}
		aria-expanded={isOpen}
		aria-controls={panelId}
	>
		<h3 class="text-[0.9rem] font-semibold m-0 text-amber-400">{title}</h3>
		<div class:rotate-180={isOpen} class="transition-transform duration-300">
			<ChevronDown size={16} />
		</div>
	</button>

	{#if isOpen}
		<div
			class="p-3 border border-t-0 border-white/10 rounded-b-md bg-black/20 overflow-hidden"
			transition:slide={{ duration: 300 }}
			id={panelId}
			role="region"
		>
			<slot />
		</div>
	{/if}
</div>
