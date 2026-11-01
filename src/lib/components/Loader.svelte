<script lang="ts">
	import BouncyLoader from './BouncyLoader.svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		message?: string;
	}

	let { message = "Loading..." }: Props = $props();
</script>

<div
	class="flex items-center justify-center w-full h-64"
	in:fade={{ duration: 200 }}
	out:fly={{ y: -20, duration: 300, easing: (t) => t * t }}
>
	<div class="flex flex-col items-center">
		<div class="mb-4">
			<BouncyLoader size={48} />
		</div>
		<p class="text-white text-xl">{message}</p>
	</div>
</div>
