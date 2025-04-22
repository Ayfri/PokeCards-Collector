<script lang="ts">
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import Select from '@components/filters/Select.svelte';
	import Button from '@components/filters/Button.svelte';

	export let sortDirection: 'asc' | 'desc';
	export let sortValue: string;
	export let options: { value: string; label: string }[];

	function toggleSortDirection() {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for="sort" class="text-xs text-gray-300">Sort by</label>
	<div class="flex items-center gap-2">
		<Button
			class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded text-sm h-8 w-10 min-w-10 transition-all duration-300 z-0"
			onClick={toggleSortDirection}
		>
			<span class="relative z-10">
				{#if sortDirection === 'asc'}
					<ArrowUp size={16} />
				{:else}
					<ArrowDown size={16} />
				{/if}
			</span>
		</Button>
		<Select
			bind:value={sortValue}
			label=""
			id="sort"
			options={options}
		/>
	</div>
</div>
