<script lang="ts">
	import LanguageSwitch from '#components/LanguageSwitch.svelte';
	import { cachedJson } from '#helpers/utils.ts';
	import type { Language, LanguagePaths } from '#helpers/catalogues.ts';

	interface Props {
		cardCode: string;
		language: Language;
		/** Versions the page load already started for its own card, so only a card swapped in the browser asks the endpoint. */
		known: { cardCode: string; versions: Promise<LanguagePaths> };
	}

	let { cardCode, language, known }: Props = $props();

	const versions = $derived(cardCode === known.cardCode
		? known.versions
		: cachedJson<LanguagePaths>(fetch, `/api/card-versions?language=${language}&code=${encodeURIComponent(cardCode)}`).catch((): LanguagePaths => ({})));
</script>

{#await versions then found}
	<LanguageSwitch class="w-full justify-center" {language} paths={found} />
{/await}
