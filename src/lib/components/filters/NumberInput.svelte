<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value?: number | undefined;
		placeholder?: string;
		min?: number | undefined;
		max?: number | undefined;
		debounceFunction?: (value: number | undefined) => void;
		class?: string;
	}

	let {
		id,
		label,
		value = $bindable(undefined),
		placeholder = "",
		min = undefined,
		max = undefined,
		debounceFunction = () => {},
		class: className = ""
	}: Props = $props();
	

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const numValue = target.value === '' ? undefined : parseFloat(target.value);
		if (!isNaN(numValue ?? NaN)) { // Check if parsing resulted in a valid number or undefined
			debounceFunction(numValue);
		}
	}
</script>

<div class="flex flex-col gap-1 min-w-16 flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<input
		class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {value !== undefined && !isNaN(value) ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
		{id}
		{max}
		{min}
		{placeholder}
		bind:value={value}
		oninput={handleInput}
		type="number"
	/>
</div> 