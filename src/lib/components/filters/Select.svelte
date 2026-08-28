<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value: string;
		placeholder?: string | undefined;
		options: { value: string; label: string }[];
		activeCondition?: boolean;
	}

	let {
		id,
		label,
		value = $bindable(),
		placeholder = undefined,
		options,
		activeCondition = value !== 'all'
	}: Props = $props();

	// Event dispatcher pour la mise à jour de la valeur
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	{#if label}
		<label for={id} class="text-xs text-gray-300">{label}</label>
	{/if}
	<select
		{id}
		onchange={handleChange}
		value={value}
		class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {activeCondition ? 'border-amber-400 text-amber-400' : 'border-white'}"
	>
		{#if placeholder}
			<option value="" selected disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option class="bg-black text-white" value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
