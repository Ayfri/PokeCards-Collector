<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string;
	export let placeholder: string = "";
	export let autocomplete: string | undefined = undefined;
	export let debounceFunction: (value: string) => void;
	export let type: "email" | "password" | "text" | "url" = "text";

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		debounceFunction(target.value);
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	{#if type === "email"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
			{autocomplete}
			{id}
			{placeholder}
			type="email"
			bind:value={value}
			on:input={handleInput}
		/>
	{:else if type === "password"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			type="password"
		/>
	{:else if type === "text"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			type="text"
		/>
	{:else if type === "url"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			type="url"
		/>
	{/if}
</div>
