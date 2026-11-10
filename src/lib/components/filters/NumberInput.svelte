<script lang="ts">
	interface Props {
		id: string;
		label: string;
		max?: number | undefined;
		min?: number | undefined;
		value?: number | undefined;
	}

	let {
		id,
		label,
		max = undefined,
		min = undefined,
		value = $bindable(undefined)
	}: Props = $props();
</script>

<div class="flex flex-col gap-1 min-w-16 flex-1">
	<label class="text-xs text-gray-300" for={id}>{label}</label>
	<input
		bind:value={value}
		class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400 {value !== undefined && !isNaN(value) ? 'border-gold-400 text-gold-400' : 'border-white'}"
		{id}
		{max}
		{min}
		type="number"
	/>
</div>
