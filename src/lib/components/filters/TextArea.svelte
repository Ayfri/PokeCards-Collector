<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		id: string;
		label: string;
		placeholder?: string;
		rows?: number;
		value: string;
	}

	let {
		class: className = "",
		id,
		label,
		placeholder = "",
		rows = 4,
		value = $bindable()
	}: Props = $props();
    

	let textareaElement = $state<HTMLTextAreaElement>();

	function adjustHeight(element: HTMLTextAreaElement) {
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}

	function handleInput(event: Event) {
		adjustHeight(event.target as HTMLTextAreaElement);
	}

	onMount(() => {
		if (textareaElement) {
			adjustHeight(textareaElement);
		}
	});
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label class="text-xs text-gray-300" for={id}>{label}</label>
	<textarea
		bind:this={textareaElement}
		bind:value={value}
		class="bg-transparent border-2 rounded-sm text-white p-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400 resize-none overflow-hidden {value ? 'border-gold-400 text-gold-400' : 'border-white'} {className}"
		{id}
		oninput={handleInput}
		{placeholder}
		{rows}
	></textarea>
</div>
