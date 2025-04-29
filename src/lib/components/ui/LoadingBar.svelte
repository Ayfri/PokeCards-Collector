<script lang="ts">
	import { loadingStore } from '$lib/stores/loading';
	import { fade } from 'svelte/transition';
</script>

{#if $loadingStore}
	<div 
		class="fixed top-0 left-0 w-full h-1 z-50" 
		in:fade={{ duration: 100 }} 
		out:fade={{ duration: 200 }}
	>
		<div class="loading-bar"></div>
	</div>
{/if}

<style lang="postcss">
	.loading-bar {
		height: 100%;
		background: linear-gradient(90deg, theme(colors.gray.800) 0%, theme(colors.gold.400) 50%, theme(colors.gray.800) 100%);
		background-size: 200% 100%;
		animation: loading-animation 1.5s infinite linear;
		width: 100%;
	}
	
	@keyframes loading-animation {
		0% { background-position: 100% 0; }
		100% { background-position: -100% 0; }
	}
</style> 