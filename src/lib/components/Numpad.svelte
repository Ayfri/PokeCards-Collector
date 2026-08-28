<script lang="ts">
	import DeleteIcon from '@lucide/svelte/icons/delete';
	import EraserIcon from '@lucide/svelte/icons/eraser';

	interface Props {
		onKeyPress: (key: string) => void;
	}

	let { onKeyPress }: Props = $props();

	const numpadLayout = [
		['7', '8', '9'],
		['4', '5', '6'],
		['1', '2', '3'],
		['C', '0', 'Backspace']
	];

	function getKeyLabel(key: string): string {
		if (key === 'Backspace') return 'Delete the last digit';
		if (key === 'C') return 'Clear the guess';
		return `Type ${key}`;
	}
</script>

<div class="grid w-full grid-cols-3 gap-2 rounded-lg border border-gold-400/40 bg-gray-900 p-2 shadow-xl">
	{#each numpadLayout as row}
		{#each row as key}
			<button
				class="flex aspect-3/2 max-h-12 items-center justify-center md:max-h-14
							bg-gray-800 rounded-md border border-gray-700
							hover:bg-gray-700 hover:border-gold-400
							focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gold-400
							active:scale-95 active:bg-gray-700
							text-xl md:text-2xl font-semibold transition-all duration-150
							{key === 'C' || key === 'Backspace' ? 'text-gold-400 hover:text-gold-300' : 'text-gold-300'}"
				onclick={() => onKeyPress(key)}
				aria-label={getKeyLabel(key)}
				title={getKeyLabel(key)}
				type="button"
			>
				{#if key === 'Backspace'}
					<DeleteIcon size={22} />
				{:else if key === 'C'}
					<EraserIcon size={20} />
				{:else}
					{key}
				{/if}
			</button>
		{/each}
	{/each}
</div>
