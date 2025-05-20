<script lang="ts">
	import BouncyLoader from './BouncyLoader.svelte';
	import { fade, fly } from 'svelte/transition';

	export let message: string = "Loading...";
	export let size: number = 48;
	// export let color: string = "gold"; // No longer used by BouncyLoader directly for solid color
	export let gradientColorStart: string = '#fbc54a';
	export let gradientColorEnd: string = '#ae8833';
</script>

<div
	class="flex items-center justify-center w-full h-64"
	in:fade={{ duration: 200 }}
	out:fly={{ y: -20, duration: 300, easing: (t) => t * t }}
>
	<div class="flex flex-col items-center">
		<div class="mb-4">
			<BouncyLoader {size} {gradientColorStart} {gradientColorEnd} />
		</div>
		<p class="text-white text-xl">{message}</p>
	</div>
</div>

<style>
	/* Removed unused spin animation and loader-spin class */
</style> 