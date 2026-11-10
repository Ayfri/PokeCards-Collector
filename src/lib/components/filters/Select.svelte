<script lang="ts">
	interface Props {
		activeCondition?: boolean;
		id: string;
		label: string;
		options: { label: string; value: string; }[];
		placeholder?: string | undefined;
		value: string;
	}

	let {
		value = $bindable(),
		activeCondition = value !== 'all',
		id,
		label,
		options,
		placeholder = undefined
	}: Props = $props();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	{#if label}
		<label class="text-xs text-gray-300" for={id}>{label}</label>
	{/if}
	<select
		class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400 {activeCondition ? 'border-gold-400 text-gold-400' : 'border-white'}"
		{id}
		onchange={handleChange}
		value={value}
	>
		{#if placeholder}
			<option disabled selected value="">{placeholder}</option>
		{/if}
		{#each options as option}
			<option class="bg-black text-white" value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
