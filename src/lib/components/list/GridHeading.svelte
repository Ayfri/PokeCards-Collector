<script lang="ts">
	interface Props {
		description: string;
		note?: string;
		title: string;
	}

	let { description, note, title }: Props = $props();
</script>

<!-- Rendered outside the `{#await}` that holds the grid: the cards stream in, but the heading and the lede are in
     the first byte, which is all a crawler that does not run JavaScript ever sees of this page. -->
<header class="mx-auto max-w-3xl px-4 pb-2 text-center">
	<h1 class="text-3xl font-bold text-gold-400 max-md:text-2xl">{title}</h1>
	<p class="mt-2 text-sm text-balance text-gray-300 md:text-base">{description}</p>
	{#if note}
		<p class="mt-3 rounded-sm border-l-4 border-yellow-500 bg-yellow-200 p-2 text-xs text-yellow-900">{note}</p>
	{/if}
</header>
