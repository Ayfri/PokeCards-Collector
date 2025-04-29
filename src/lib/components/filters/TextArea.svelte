<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string;
	export let placeholder: string = "";
	export let autocomplete: string | undefined = undefined;
	export let debounceFunction: (value: string) => void = () => {};
	export let rows: number = 4;

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		debounceFunction(target.value);
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<textarea
		class="bg-transparent border-2 rounded text-white p-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
		{autocomplete}
		{id}
		{placeholder}
		{rows}
		bind:value={value}
		on:input={handleInput}
	/>
</div> 