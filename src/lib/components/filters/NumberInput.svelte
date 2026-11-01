<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value?: number | undefined;
		min?: number | undefined;
		max?: number | undefined;
	}

	let {
		id,
		label,
		value = $bindable(undefined),
		min = undefined,
		max = undefined
	}: Props = $props();
</script>

<div class="flex flex-col gap-1 min-w-16 flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<input
		class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400 {value !== undefined && !isNaN(value) ? 'border-gold-400 text-gold-400' : 'border-white'}"
		{id}
		{max}
		{min}
		bind:value={value}
		type="number"
	/>
</div>
