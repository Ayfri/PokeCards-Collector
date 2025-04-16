<script lang="ts">
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';

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
			class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded text-sm h-8 w-10 min-w-10 transition-all duration-300 z-0"
			on:click={toggleSortDirection}
		>
			<span class="relative z-10">
				{#if sortDirection === 'asc'}
					<ArrowUp size={16} />
				{:else}
					<ArrowDown size={16} />
				{/if}
			</span>
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
	
	/* Base styles for animated buttons */
	.animated-hover-button {
		transition: color 0.3s ease-in-out, border-color 0.3s ease-in-out;
	}

	.animated-hover-button::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 0;
		background-color: #FFB700;
		transition: height 0.3s ease-in-out;
		z-index: -1;
	}

	.animated-hover-button:hover::before {
		height: 100%;
	}

	.animated-hover-button:hover {
		color: black;
		border-color: #FFB700;
	}
</style>
