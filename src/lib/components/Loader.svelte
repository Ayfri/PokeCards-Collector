<script lang="ts">
	import BouncyLoader from './BouncyLoader.svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		message?: string;
		size?: number;
		gradientColorStart?: string;
		gradientColorEnd?: string;
	}

	let {
		message = "Loading...",
		size = 48,
		gradientColorStart = '#fbc54a',
		gradientColorEnd = '#ae8833'
	}: Props = $props();
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
