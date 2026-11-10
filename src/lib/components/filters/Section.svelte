<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';

	interface Props {
		children?: import('svelte').Snippet;
		isOpen: boolean;
		title: string;
	}

	let { children, isOpen = $bindable(), title }: Props = $props();

	const panelId = $props.id();
</script>

<div class="mb-2">
	<button
		aria-controls={panelId}
		aria-expanded={isOpen}
		class="flex justify-between items-center w-full px-4 py-2 cursor-pointer bg-black/30 hover:bg-black/40 rounded-md border border-white/10 {isOpen ? 'rounded-b-none' : ''}"
		onclick={() => (isOpen = !isOpen)}
		title={isOpen ? `Collapse ${title}` : `Expand ${title}`}
		type="button"
	>
		<h3 class="text-sm font-semibold m-0 text-gold-400">{title}</h3>
		<div class={['transition-transform duration-300', isOpen && 'rotate-180']}>
			<ChevronDown size={16} />
		</div>
	</button>

	{#if isOpen}
		<div
			class="p-3 border border-t-0 border-white/10 rounded-b-md bg-black/20 overflow-hidden"
			id={panelId}
			role="region"
			transition:slide={{ duration: 300 }}
		>
			{@render children?.()}
		</div>
	{/if}
</div>
