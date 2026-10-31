<script lang="ts">
	import type { Set } from '$lib/types';
	import SetLogo from '@components/SetLogo.svelte';
	import Layers from '@lucide/svelte/icons/layers';

	interface Props {
		/** Positions the badge inside its tile, the collection controls own the bottom-right corner. */
		class?: string;
		set: Pick<Set, 'logo' | 'name' | 'symbol'>;
		style?: string;
	}

	let { class: classNames = '', set, style }: Props = $props();
</script>

<a
	href="/cards-list?set={encodeURIComponent(set.name)}"
	class="absolute z-10 p-1 bg-black/50 border border-white/70 rounded-full hover:bg-white/20 transition-colors size-8 flex items-center justify-center {classNames}"
	{style}
	aria-label="View all cards from set {set.name}"
	title="View all cards from set {set.name}"
	tabindex="-1"
>
	<SetLogo class="size-6 object-contain" {set}>
		{#snippet fallback()}<Layers class="text-white" size={20} />{/snippet}
	</SetLogo>
</a>
