<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { fade } from 'svelte/transition';
	import Flag from '#components/Flag.svelte';
	import { CATALOGUES, LANGUAGES, type Language, type LanguagePaths } from '#helpers/catalogues.ts';

	interface Props {
		class?: ClassValue;
		language: Language;
		paths: LanguagePaths;
	}

	let { class: className, language, paths }: Props = $props();

	const shown = $derived(LANGUAGES.filter(target => paths[target]));
	const pill = 'flex items-center gap-2 rounded-md bg-black/60 px-3 py-1 text-sm';
</script>

{#if shown.length > 1}
	<nav class={['flex flex-wrap gap-2', className]} aria-label="Language" in:fade={{ duration: 400 }}>
		{#each shown as target (target)}
			{#if target === language}
				<span class={[pill, 'text-gold-400 ring-1 ring-gold-400']} aria-current="true">
					<Flag language={target} class="h-4 w-6 rounded-sm" />
					{CATALOGUES[target].adjective}
				</span>
			{:else}
				<a class={[pill, 'text-white transition-colors hover:bg-black/80 hover:text-gold-400']} href={paths[target]}>
					<Flag language={target} class="h-4 w-6 rounded-sm" />
					{CATALOGUES[target].adjective}
				</a>
			{/if}
		{/each}
	</nav>
{/if}
