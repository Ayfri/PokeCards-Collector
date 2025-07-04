<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import SunIcon from 'lucide-svelte/icons/sun';
	import MoonIcon from 'lucide-svelte/icons/moon';

	function toggleTheme() {
		theme.update(currentTheme => currentTheme === 'light' ? 'dark' : 'light');
	}
</script>

<button
	on:click={toggleTheme}
	class="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gold-400"
	title="Toggle theme"
	aria-label="Toggle between light and dark mode"
>
	{#if $theme === 'light'}
		<MoonIcon size={20} />
	{:else}
		<SunIcon size={20} />
	{/if}
</button>