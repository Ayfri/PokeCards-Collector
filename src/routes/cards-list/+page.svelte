<script lang="ts">
	import GridHeading from '#lib/components/list/GridHeading.svelte';
	import PayloadGrid from '#lib/components/list/PayloadGrid.svelte';
	import type { PageData } from './$types';
	import { filters } from '#stores/filters.svelte.ts';
	import { catalogueRoutes } from '#helpers/catalogues.ts';
	import { payloadUrl } from '#helpers/utils.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const selectedSetName = $derived(filters.set !== 'all' ? (data.sets.find(set => set.name.toLowerCase() === filters.set)?.name ?? null) : null);
</script>

<svelte:head>
	{#if data.preloadPayload}
		<link as="fetch" crossorigin="anonymous" href={payloadUrl(data.payload)} rel="preload" />
	{/if}
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col text-lg text-white">
	<GridHeading description={data.description} language="en" paths={catalogueRoutes('gridRoute')} title={data.title} />

	<PayloadGrid grid={data.grid} {selectedSetName} sets={data.sets} />
</div>
