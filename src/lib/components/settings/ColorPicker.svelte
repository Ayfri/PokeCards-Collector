<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import {browser} from '$app/environment';
	import {onMount} from 'svelte';

	interface Props {
		/** Hex color, `#RRGGBB`. */
		value: string;
		/** Restored by the reset button. */
		defaultValue: string;
	}

	let {value = $bindable(), defaultValue}: Props = $props();

	/** Ready-made picks so the common case is one click instead of dragging the saturation square. */
	const PRESETS = ['#fbc54a', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#e5e7eb'];

	let pickerReady = $state(false);
	let copied = $state(false);

	const isValid = $derived(/^#[0-9A-Fa-f]{6}$/.test(value));

	onMount(async () => {
		// vanilla-colorful registers a custom element, so it must never run during SSR.
		await import('vanilla-colorful/hex-color-picker.js');
		pickerReady = true;
	});

	function handleColorChange(event: CustomEvent<{ value: string }>) {
		value = event.detail.value;
	}

	async function copyHexValue() {
		if (!browser || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
	<div class="shrink-0">
		{#if pickerReady}
			<hex-color-picker color={isValid ? value : defaultValue} oncolor-changed={handleColorChange}></hex-color-picker>
		{:else}
			<div class="size-[200px] animate-pulse rounded-lg bg-gray-800"></div>
		{/if}
	</div>

	<div class="flex min-w-0 flex-1 flex-col gap-3">
		<div class="flex items-center gap-2">
			<input
				aria-label="Profile color hex value"
				bind:value
				class="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 font-mono text-gray-200 focus:border-gold-400 focus:outline-hidden"
				maxlength="7"
				pattern={'^#[0-9A-Fa-f]{6}$'}
				placeholder="#RRGGBB"
				spellcheck="false"
				type="text"
			/>
			<button
				class="rounded-md border border-gray-700 bg-gray-800/60 p-2 text-gray-400 transition-colors hover:border-gold-400 hover:text-gold-400"
				onclick={copyHexValue}
				title="Copy hex value"
				type="button"
			>
				{#if copied}
					<CheckIcon class="text-green-400" size={16} />
				{:else}
					<CopyIcon size={16} />
				{/if}
			</button>
			<button
				class="rounded-md border border-gray-700 bg-gray-800/60 p-2 text-gray-400 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
				disabled={value === defaultValue}
				onclick={() => (value = defaultValue)}
				title="Reset to the default color"
				type="button"
			>
				<RotateCcwIcon size={16} />
			</button>
		</div>

		{#if !isValid}
			<p class="text-xs text-red-400">Enter a hex color like #FF0000.</p>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#each PRESETS as preset (preset)}
				<button
					aria-label="Use color {preset}"
					class="size-8 rounded-full border-2 transition-transform hover:scale-110 {value.toLowerCase() === preset ? 'border-white' : 'border-transparent'}"
					onclick={() => (value = preset)}
					style="background-color: {preset}"
					title={preset}
					type="button"
				></button>
			{/each}
		</div>
	</div>
</div>

<style>
	hex-color-picker {
		--width: 200px;
		--height: 200px;
	}

	hex-color-picker::part(saturation) {
		border-radius: 8px 8px 0 0;
	}

	hex-color-picker::part(hue) {
		border-radius: 8px;
		margin-top: 10px;
	}

	hex-color-picker::part(saturation-pointer),
	hex-color-picker::part(hue-pointer) {
		border: 2px solid white;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
		height: 20px;
		width: 20px;
	}
</style>
