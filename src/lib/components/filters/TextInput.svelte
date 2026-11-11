<script lang="ts">
	import { debounce } from '#helpers/utils.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		class?: string;
		icon?: LucideIcon;
		id: string;
		label: string;
		labelClass?: string;
		onDebouncedInput?: (value: string) => void;
		placeholder?: string;
		type?: "text" | "url";
		value: string;
	}

	let {
		class: className = "",
		icon: Icon,
		id,
		label,
		labelClass = '',
		onDebouncedInput = () => {},
		placeholder = "",
		type = "text",
		value = $bindable(),
		...rest
	}: Props = $props();

	const debouncedChange = $derived(debounce((newValue: string) => onDebouncedInput(newValue), 120));
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label class="text-xs text-gray-300 {labelClass}" for={id}>{label}</label>
	<div class="relative flex">
		{#if Icon}
			<Icon
				class={['absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none', value ? 'text-gold-400' : 'text-gray-400']}
				size={16}
			/>
		{/if}
		<input
			bind:value={value}
			class={[
				'bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400',
				value ? 'border-gold-400 text-gold-400' : 'border-white',
				Icon && 'pl-8',
				className,
			]}
			{id}
			oninput={event => debouncedChange(event.currentTarget.value)}
			{placeholder}
			{type}
			{...rest}
		/>
	</div>
</div>
