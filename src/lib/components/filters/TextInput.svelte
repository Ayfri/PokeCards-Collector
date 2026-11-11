<script lang="ts">
	import { debounce } from '#helpers/utils.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import { onMount } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		/**
		 * Calls `onDebouncedInput` once on mount when the field already holds text, which the browser restored or the visitor typed before hydration:
		 * no `input` event runs for it, so the list would stay unfiltered. Off by default, since a caller may hold that text as applied already.
		 */
		applyOnMount?: boolean;
		class?: string;
		/** Draws a small X inside the field while it holds text; it empties the field and calls `onDebouncedInput('')`. */
		clearable?: boolean;
		/** Right-aligned in the label row, for a result count such as `12 of 202`. Nothing is drawn while it is empty. */
		hint?: string | undefined;
		icon?: LucideIcon;
		/** Position of the icon, replacing the default `left-2`. */
		iconClass?: string;
		id: string;
		label: string;
		labelClass?: string;
		onDebouncedInput?: (value: string) => void;
		placeholder?: string;
		type?: "text" | "url";
		value: string;
	}

	let {
		applyOnMount = false,
		class: className = "",
		clearable = false,
		hint,
		icon: Icon,
		iconClass = 'left-2',
		id,
		label,
		labelClass = '',
		onDebouncedInput = () => {},
		placeholder = "",
		type = "text",
		value = $bindable(),
		...rest
	}: Props = $props();

	const hintId = $props.id();
	const debouncedChange = $derived(debounce((newValue: string) => onDebouncedInput(newValue), 120));

	onMount(() => {
		if (applyOnMount && value) onDebouncedInput(value);
	});

	/** Goes through the debounce like typing does, so a keystroke still pending cannot land after the clear. */
	function clear() {
		value = '';
		debouncedChange('');
		document.getElementById(id)?.focus();
	}
</script>

{#snippet heading()}
	<label class="text-xs text-gray-300 {labelClass}" for={id}>{label}</label>
{/snippet}

<div class="flex flex-col gap-1 min-w-32 flex-1">
	{#if hint}
		<div class="flex items-baseline justify-between gap-2">
			{@render heading()}
			<span class="text-xs tabular-nums text-gold-400" id={hintId}>{hint}</span>
		</div>
	{:else}
		{@render heading()}
	{/if}
	<div class="relative flex">
		{#if Icon}
			<Icon
				class={['absolute top-1/2 -translate-y-1/2 pointer-events-none', iconClass, value ? 'text-gold-400' : 'text-gray-400']}
				size={16}
			/>
		{/if}
		<input
			bind:value={value}
			class={[
				'bg-transparent border-2 rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400',
				value ? 'border-gold-400 text-gold-400' : 'border-white',
				Icon && 'pl-8',
				clearable && value && 'pr-8',
				className,
			]}
			aria-describedby={hint ? hintId : undefined}
			{id}
			oninput={event => debouncedChange(event.currentTarget.value)}
			{placeholder}
			{type}
			{...rest}
		/>
		{#if clearable && value}
			<button
				aria-label="Clear search"
				class="focus-ring absolute right-1 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-gray-400 transition-colors hover:text-gold-400"
				onclick={clear}
				title="Clear"
				type="button"
			>
				<XIcon size={14} />
			</button>
		{/if}
	</div>
</div>
