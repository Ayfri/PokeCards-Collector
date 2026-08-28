<script lang="ts">
	import type { FullAutoFill } from 'svelte/elements';
	import { onMount } from 'svelte';

	interface Props {
		id: string;
		label: string;
		value: string;
		placeholder?: string;
		autocomplete?: FullAutoFill | undefined;
		debounceFunction?: (value: string) => void;
		rows?: number;
		class?: string;
	}

	let {
		id,
		label,
		value = $bindable(),
		placeholder = "",
		autocomplete = undefined,
		debounceFunction = () => {},
		rows = 4,
		class: className = ""
	}: Props = $props();
    

	let textareaElement = $state<HTMLTextAreaElement>();

	function adjustHeight(element: HTMLTextAreaElement) {
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		debounceFunction(target.value);
		adjustHeight(target);
	}

	onMount(() => {
		if (textareaElement) {
			adjustHeight(textareaElement);
		}
	});
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label for={id} class="text-xs text-gray-300">{label}</label>
	<textarea
		bind:this={textareaElement}
		class="bg-transparent border-2 rounded-sm text-white p-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 resize-none overflow-hidden {value ? 'border-amber-400 text-amber-400' : 'border-white'} {className}"
		{autocomplete}
		{id}
		{placeholder}
		{rows}
		bind:value={value}
		oninput={handleInput}
	></textarea>
</div>
