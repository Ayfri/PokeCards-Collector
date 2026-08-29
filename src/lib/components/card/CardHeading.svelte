<script lang="ts">
	import type { Card, Set } from '$lib/types';

	interface Props {
		card: Card;
		set?: Set;
	}

	let { card, set }: Props = $props();

	const facts = $derived([
		set?.name ?? card.setName,
		card.localId ? `#${card.localId}` : null,
		card.rarity,
		card.artist ? `Illustrated by ${card.artist}` : null,
	].filter(Boolean).join(' \u00b7 '));
</script>

<!-- The card display renders its own labels only after hydration, so this is the page's one server-rendered
     heading: without it a card page reaches a crawler with no `h1` and no text at all. -->
<header class="mb-2 text-center">
	<h1 class="text-2xl font-bold text-gold-400 max-md:text-xl">{card.name}</h1>
	<p class="mt-1 text-sm text-gray-300">{facts}</p>
</header>
