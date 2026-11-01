<script lang="ts">
	interface Props {
		description: string;
		note?: string;
		title: string;
	}

	let { description, note, title }: Props = $props();
</script>

<!-- Rendered outside the `{#await}` that holds the grid: the cards stream in, but the heading and the lede are in
     the first byte, which is all a crawler that does not run JavaScript ever sees of this page. It is one line above the
     toolbar so the grid keeps the viewport: the lede is truncated on screen, while the full text stays in the markup. -->
<header class="flex min-w-0 shrink-0 items-baseline gap-x-3 px-4 pb-1 max-md:flex-col max-md:items-center max-md:text-center lg:px-10">
	<h1 class="shrink-0 text-lg font-bold text-gold-400">{title}</h1>
	<p class="min-w-0 truncate text-xs text-gray-400 max-md:line-clamp-2 max-md:whitespace-normal" title={description}>{description}</p>
	{#if note}
		<p class="shrink-0 text-xs text-gold-300">{note}</p>
	{/if}
</header>
