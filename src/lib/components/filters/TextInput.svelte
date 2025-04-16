<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string;
	export let placeholder: string = "";
	export let debounceFunction: (value: string) => void;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		debounceFunction(target.value);
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<input
		{id}
		bind:value={value}
		on:input={handleInput}
		class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
		type="text"
		{placeholder}
	>
</div>
