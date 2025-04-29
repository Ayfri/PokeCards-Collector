<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: number | undefined = undefined;
	export let placeholder: string = "";
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let debounceFunction: (value: number | undefined) => void = () => {};
	let className: string = "";
	export {className as class};

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const numValue = target.value === '' ? undefined : parseFloat(target.value);
		if (!isNaN(numValue ?? NaN)) { // Check if parsing resulted in a valid number or undefined
			debounceFunction(numValue);
		}
	}
</script>

<div class="flex flex-col gap-1 min-w-[4rem] flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<input
		class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value !== undefined && !isNaN(value) ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
		{id}
		{max}
		{min}
		{placeholder}
		bind:value={value}
		on:input={handleInput}
		type="number"
	/>
</div> 