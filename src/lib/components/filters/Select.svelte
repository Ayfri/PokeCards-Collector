<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string;
	export let options: { value: string; label: string }[];
	export let activeCondition: boolean = value !== 'all';

	// Event dispatcher pour la mise à jour de la valeur
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<select
		{id}
		on:change={handleChange}
		value={value}
		class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {activeCondition ? 'border-amber-400 text-amber-400' : 'border-white'}"
	>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>

<style>
	select option {
		background-color: black;
		color: white;
	}
</style>
