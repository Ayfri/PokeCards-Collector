<script lang="ts">
	import { fade } from 'svelte/transition';
	import Flag from '#components/Flag.svelte';
	import { cachedJson } from '#helpers/utils.ts';
	import { CATALOGUES, LANGUAGES, type CardVersions, type Language } from '#helpers/catalogues.ts';

	interface Props {
		cardCode: string;
		language: Language;
		/** Versions the page load already started for its own card, so only a card swapped in the browser asks the endpoint. */
		known: { cardCode: string; versions: Promise<CardVersions> };
	}

	let { cardCode, language, known }: Props = $props();

	const versions = $derived(cardCode === known.cardCode
		? known.versions
		: cachedJson<CardVersions>(fetch, `/api/card-versions?language=${language}&code=${encodeURIComponent(cardCode)}`).catch((): CardVersions => ({})));

	const pill = 'flex items-center gap-2 rounded-md bg-black/60 px-3 py-1 text-sm';
</script>

{#await versions then found}
	{@const available = LANGUAGES.flatMap(target => {
		const path = found[target];
		return path ? [{ path, target }] : [];
	})}
	{#if available.length > 1}
		<div class="w-full" in:fade={{ duration: 400 }}>
			<nav class="flex gap-2 justify-center" aria-label="Card language">
				{#each available as { path, target } (target)}
					{#if target === language}
						<span class={[pill, 'text-gold-400 ring-1 ring-gold-400']} aria-current="true">
							<Flag language={target} class="h-4 w-6 rounded-sm" />
							{CATALOGUES[target].adjective}
						</span>
					{:else}
						<a class={[pill, 'text-white transition-colors hover:bg-black/80 hover:text-gold-400']} href={path}>
							<Flag language={target} class="h-4 w-6 rounded-sm" />
							{CATALOGUES[target].adjective}
						</a>
					{/if}
				{/each}
			</nav>
		</div>
	{/if}
{/await}
