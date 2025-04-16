<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	export let title: string;
	export let isOpen = false;
</script>

<div class="mb-2">
	<div
		class="flex justify-between items-center px-4 py-2 cursor-pointer bg-black/30 hover:bg-black/40 rounded-t-md border border-white/10 {isOpen ? 'rounded-b-none' : 'rounded-b-md'}"
		on:click={() => isOpen = !isOpen}
	>
		<h3 class="text-[0.9rem] font-semibold m-0 text-amber-400">{title}</h3>
		{#if isOpen}
			<ChevronUp size={16} />
		{:else}
			<ChevronDown size={16} />
		{/if}
	</div>

	{#if isOpen}
		<div class="p-3 border border-t-0 border-white/10 rounded-b-md bg-black/20">
			<slot />
		</div>
	{/if}
</div>
