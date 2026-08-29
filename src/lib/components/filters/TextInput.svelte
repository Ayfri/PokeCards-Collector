<script lang="ts">
	import { debounce } from '$helpers/debounce';
	import type { FullAutoFill, HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		id: string;
		label: string;
		labelClass?: string;
		value: string;
		placeholder?: string;
		autocomplete?: FullAutoFill | undefined;
		debounceFunction?: (value: string) => void;
		debounceDelay?: number;
		type?: "email" | "password" | "text" | "url";
		onInput?: (event: Event) => void;
		onKeydown?: (event: KeyboardEvent) => void;
		class?: string;
	}

	let {
		id,
		label,
		labelClass = '',
		value = $bindable(),
		placeholder = "",
		autocomplete = undefined,
		debounceFunction = () => {},
		debounceDelay = 120,
		type = "text",
		onInput = () => {},
		onKeydown = () => {},
		class: className = "",
		...rest
	}: Props = $props();
	

	const debouncedChange = $derived(debounce((newValue: string) => debounceFunction(newValue), debounceDelay));

	function handleInput(event: Event) {
		onInput(event);
		debouncedChange((event.target as HTMLInputElement).value);
	}

	function handleKeydown(event: KeyboardEvent) {
		onKeydown(event);
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label for={id} class="text-xs text-gray-300 {labelClass}">{label}</label>
	{#if type === "email"}
		<input
			class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			type="email"
			bind:value={value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			{...rest}
		/>
	{:else if type === "password"}
		<input
			class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			type="password"
			{...rest}
		/>
	{:else if type === "text"}
		<input
			class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			type="text"
			{...rest}
		/>
	{:else if type === "url"}
		<input
			class="bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
			{autocomplete}
			{id}
			{placeholder}
			bind:value={value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			type="url"
			{...rest}
		/>
	{/if}
</div>
