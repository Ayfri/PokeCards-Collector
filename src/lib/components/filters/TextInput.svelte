<script lang="ts">
	export let id: string;
	export let label: string;
	export let labelClass: string = '';
	export let value: string;
	export let placeholder: string = "";
	export let autocomplete: string | undefined = undefined;
	export let debounceFunction: (value: string) => void = () => {};
	export let debounceDelay: number = 300; // Debounce delay in milliseconds
	export let type: "email" | "password" | "text" | "url" = "text";
	export let onInput: (event: Event) => void = () => {};
	export let onKeydown: (event: KeyboardEvent) => void = () => {};
	let className: string = "";
	export {className as class};

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onInput(event);

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer for debounced function
		debounceTimer = setTimeout(() => {
			debounceFunction(target.value);
		}, debounceDelay);
	}

	function handleKeydown(event: KeyboardEvent) {
		onKeydown(event);
	}
</script>

<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
	<label for={id} class="text-xs text-gray-300 {labelClass}">{label}</label>
	{#if type === "email"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			type="email"
			bind:value={value}
			on:input={handleInput}
			on:keydown={handleKeydown}
			{...$$restProps}
		/>
	{:else if type === "password"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			on:keydown={handleKeydown}
			type="password"
			{...$$restProps}
		/>
	{:else if type === "text"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			on:keydown={handleKeydown}
			type="text"
			{...$$restProps}
		/>
	{:else if type === "url"}
		<input
			class="bg-transparent border-2 rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			on:input={handleInput}
			on:keydown={handleKeydown}
			type="url"
			{...$$restProps}
		/>
	{/if}
</div>
