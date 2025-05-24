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

<div class="numpad grid grid-cols-3 gap-1 p-2 bg-gray-700 rounded-lg shadow-lg w-48 md:w-56">
	{#each numpadLayout as row}
		{#each row as key}
			<button 
				class="numpad-button flex items-center justify-center h-12 md:h-14 
							bg-gray-600 text-white rounded hover:bg-gray-500 
							focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-gold-400 
							text-xl md:text-2xl font-medium"
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
	}
</style> 