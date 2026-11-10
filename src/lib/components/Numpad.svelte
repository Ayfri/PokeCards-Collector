<script lang="ts">
	import DeleteIcon from '@lucide/svelte/icons/delete';
	import EraserIcon from '@lucide/svelte/icons/eraser';

	interface Props {
		onKeyPress: (key: string) => void;
	}

	let { onKeyPress }: Props = $props();

	/** Read row by row in the three-column grid. */
	const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', 'Backspace'];

	function getKeyLabel(key: string): string {
		if (key === 'Backspace') return 'Delete the last digit';
		if (key === 'C') return 'Clear the guess';
		return `Type ${key}`;
	}
</script>

<div class="grid w-full grid-cols-3 gap-2 rounded-lg border border-gold-400/40 bg-gray-900 p-2 shadow-xl">
	{#each KEYS as key (key)}
		<button
			aria-label={getKeyLabel(key)}
			class={[
				'flex aspect-3/2 max-h-10 items-center justify-center rounded-md border border-gray-700 bg-gray-800 text-xl font-semibold transition-all duration-150',
				'focus-ring hover:border-gold-400 hover:bg-gray-700 active:scale-95 active:bg-gray-700 md:text-2xl',
				'[@media(min-height:46rem)]:max-h-12 md:[@media(min-height:46rem)]:max-h-14',
				key === 'C' || key === 'Backspace' ? 'text-gold-400 hover:text-gold-300' : 'text-gold-300'
			]}
			onclick={() => onKeyPress(key)}
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
</div>
