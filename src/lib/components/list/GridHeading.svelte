<script lang="ts">
	interface Props {
		description: string;
		note?: string;
		title: string;
	}

	let { description, note, title }: Props = $props();
</script>

<!-- Rendered outside the `{#await}` that holds the grid: the cards stream in, but the heading and the lede are in
     the first byte, which is all a crawler that does not run JavaScript ever sees of this page. It sits in the flex
     column above the grid, which takes whatever height is left, so the lede never pushes the cards off-screen. -->
<header class="mx-auto max-w-4xl shrink-0 px-4 pb-1 text-center">
	<h1 class="text-xl font-bold text-gold-400 max-md:text-lg">{title}</h1>
	<p class="text-xs text-balance text-gray-400 md:text-sm">{description}</p>
	{#if note}
		<p class="text-xs text-yellow-500">{note}</p>
	{/if}
</header>
