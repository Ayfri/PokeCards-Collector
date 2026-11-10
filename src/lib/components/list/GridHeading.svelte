<script lang="ts">
	import LanguageSwitch from '#components/LanguageSwitch.svelte';
	import type { Language, LanguagePaths } from '#helpers/catalogues.ts';

	interface Props {
		description: string;
		language?: Language;
		/** The same page in the other catalogues, drawn as language pills after the lede. */
		paths?: LanguagePaths;
		title: string;
	}

	let { description, language, paths, title }: Props = $props();
</script>

<!-- Rendered outside the `{#await}` that holds the grid: the cards stream in, but the heading and the lede are in
     the first byte, which is all a crawler that does not run JavaScript ever sees of this page. It is one line above the
     toolbar so the grid keeps the viewport: the lede is truncated on screen, while the full text stays in the markup. -->
<header class="flex min-w-0 shrink-0 items-baseline gap-x-3 px-4 pb-1 max-md:flex-col max-md:items-center max-md:text-center lg:px-10">
	<h1 class="shrink-0 text-lg font-bold text-gold-400">{title}</h1>
	<p class="min-w-0 truncate text-xs text-gray-400 max-md:line-clamp-2 max-md:whitespace-normal" title={description}>{description}</p>
	{#if language && paths}
		<LanguageSwitch class="shrink-0 max-md:mt-1 md:ml-auto" {language} {paths} />
	{/if}
</header>
