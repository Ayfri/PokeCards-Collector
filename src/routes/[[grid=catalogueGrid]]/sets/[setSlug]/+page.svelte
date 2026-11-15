<script lang="ts">
	import GridHeading from '#lib/components/list/GridHeading.svelte';
	import PayloadGrid from '#lib/components/list/PayloadGrid.svelte';
	import SetChecklist from '#lib/components/list/SetChecklist.svelte';
	import { formatCardNumber, setCardCount } from '#helpers/card-utils.ts';
	import { formatDate, formatEuros } from '#helpers/format.ts';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived([data.set]);
</script>

<div class="flex min-h-0 flex-1 flex-col text-lg text-white">
	<GridHeading description={data.description} language={data.catalogueLanguage} paths={data.versions} title={data.title} />

	<!-- The facts and the priciest cards are plain text in the document, which is all a crawler without JavaScript reads of the grid below. -->
	<p class="mx-4 mb-1 flex shrink-0 flex-wrap gap-x-4 text-xs text-gray-300 lg:mx-10">
		<span>Released {formatDate(data.set.releaseDate)}</span>
		{#if data.set.series}<span>Series: {data.set.series}</span>{/if}
		<span>{setCardCount(data.set)} cards</span>
		{#if data.value}<span>Total value: <span class="text-gold-400">{formatEuros(data.value)}</span></span>{/if}
	</p>
	{#if data.topCards.length}
		<p class="mx-4 mb-2 shrink-0 text-xs text-gray-300 lg:mx-10">
			<span class="font-semibold text-gold-400">Most valuable:</span>
			{#each data.topCards as card, index (card.cardCode)}
				{#if index}, {/if}<a class="transition-colors hover:text-gold-400" href={card.path}>{card.name} {formatCardNumber(card.localId, data.set.printedTotal)}</a> {formatEuros(card.price)}
			{/each}
		</p>
	{/if}
	<SetChecklist entries={data.checklist} language={data.catalogueLanguage} set={data.set} />

	<PayloadGrid grid={data.grid} note={data.note} selectedSetName={data.set.name} {sets} />
</div>
