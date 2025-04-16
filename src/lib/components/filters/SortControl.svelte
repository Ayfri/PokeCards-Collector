<script lang="ts">
	import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';

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
		<button
			class="flex items-center justify-center h-8 w-10 min-w-10 bg-transparent border-2 border-white rounded transition-all duration-200 text-white hover:border-amber-400"
			on:click={toggleSortDirection}
		>
			<ArrowUpDown class={sortDirection === 'asc' ? 'rotate-180' : ''} size={16} />
		</button>
		<select
			bind:value={sortValue}
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {sortValue !== 'sort-numero' ? 'border-amber-400 text-amber-400' : 'border-white'}"
			id="sort"
		>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	select option {
		background-color: black;
		color: white;
	}
</style>
