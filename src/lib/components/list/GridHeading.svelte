<script lang="ts">
	interface Props {
		description: string;
		note?: string;
		title: string;
	}

	let { description, note, title }: Props = $props();
</script>

<!-- Rendered outside the `{#await}` that holds the grid: the cards stream in, but the heading and the lede are in
     the first byte, which is all a crawler that does not run JavaScript ever sees of this page. Kept to a single
     baseline-aligned row so it costs the grid almost no vertical space. -->
<header class="mx-auto flex max-w-6xl flex-wrap items-baseline justify-center gap-x-2 px-4 text-center">
	<h1 class="text-lg font-bold text-gold-400 max-md:text-base">{title}</h1>
	<p class="line-clamp-1 text-xs text-gray-400">{description}</p>
	{#if note}
		<p class="text-xs text-yellow-500">{note}</p>
	{/if}
</header>
