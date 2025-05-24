<script lang="ts">
	export let onKeyPress: (key: string) => void;

	const numpadLayout = [
		['7', '8', '9'],
		['4', '5', '6'],
		['1', '2', '3'],
		['C', '0', 'Backspace']
	];

	function getKeyText(key: string): string {
		if (key === 'Backspace') return '⌫';
		return key;
	}
</script>

<div class="numpad grid grid-cols-3 gap-2 p-3 bg-gray-900 border-2 border-gold-400/50 rounded-lg shadow-xl w-48 md:w-56">
	{#each numpadLayout as row}
		{#each row as key}
			<button 
				class="numpad-button flex items-center justify-center h-12 md:h-14 
							bg-gray-800 text-gold-300 rounded-md border border-gray-700 
							hover:bg-gray-700 hover:border-gold-400 
							focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gold-400 
							text-xl md:text-2xl font-semibold transition-all duration-150
							{key === 'C' || key === 'Backspace' ? 'text-gold-400 hover:text-gold-300' : 'text-gold-300'}"
				on:click={() => onKeyPress(key)}
			>
				{getKeyText(key)}
			</button>
		{/each}
	{/each}
</div>

<style>
	.numpad-button:active {
		transform: scale(0.95);
		background-color: theme('colors.gray.600'); /* Darker active state */
	}
</style> 