<script lang="ts">
	import { page } from '$app/state';
	import { CATALOGUES, catalogueOfPath, type Language } from '$helpers/catalogues';
	import type { Set } from '$lib/types';
	import SetLogo from '@components/SetLogo.svelte';
	import Layers from '@lucide/svelte/icons/layers';

	interface Props {
		/** Positions the badge inside its tile, the collection controls own the bottom-right corner. */
		class?: string;
		/** The catalogue of the set when the page mixes several, otherwise the one the path belongs to. */
		language?: Language;
		set: Pick<Set, 'logo' | 'name' | 'symbol'>;
		style?: string;
	}

	let { class: classNames = '', language, set, style }: Props = $props();

	const catalogue = $derived(language ? CATALOGUES[language] : catalogueOfPath(page.url.pathname));
</script>

<a
	href="{catalogue.gridRoute}?set={encodeURIComponent(set.name)}"
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
