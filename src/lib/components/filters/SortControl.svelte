<script lang="ts">
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Select from '#components/filters/Select.svelte';
	import Button from '#components/filters/Button.svelte';

	interface Props {
		options: { label: string; value: string; }[];
		sortDirection: 'asc' | 'desc';
		sortValue: string;
	}

	let { options, sortDirection = $bindable(), sortValue = $bindable() }: Props = $props();

	function toggleSortDirection() {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label class="text-xs text-gray-300" for="sort">Sort by</label>
	<div class="flex items-center gap-2">
		<Button
			class="rounded-sm w-10 min-w-10"
			onClick={toggleSortDirection}
			title={sortDirection === 'asc' ? 'Sorted ascending, click for descending' : 'Sorted descending, click for ascending'}
		>
			{#if sortDirection === 'asc'}
				<ArrowUp size={16} />
			{:else}
				<ArrowDown size={16} />
			{/if}
		</Button>
		<Select
			bind:value={sortValue}
			id="sort"
			label=""
			options={options}
		/>
	</div>
</div>
