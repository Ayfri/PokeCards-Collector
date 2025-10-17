<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string;
	export let placeholder: string | undefined = undefined;
	export let options: { value: string; label: string }[];
	export let activeCondition: boolean = value !== 'all';

	// Event dispatcher pour la mise à jour de la valeur
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	{#if label}
		<label for={id} class="text-xs text-gray-300 dark:text-gray-400">{label}</label>
	{/if}
	<select
		{id}
		on:change={handleChange}
		value={value}
		class="bg-transparent border-2 cursor-pointer rounded text-white dark:text-gray-100 h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 {activeCondition ? 'border-amber-400 text-amber-400 dark:border-amber-400 dark:text-amber-400' : 'border-white dark:border-gray-600'}"
	>
		{#if placeholder}
			<option value="" selected disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option class="bg-black dark:bg-gray-800 text-white dark:text-gray-100" value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
