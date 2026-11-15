<script lang="ts">
	import ScrollButton from '#components/list/ScrollButton.svelte';

	let scrollY = $state(0);
</script>

<svelte:window bind:scrollY />

<ScrollButton direction="up" onclick={() => window.scrollTo({ behavior: 'smooth', top: 0 })} visible={scrollY > 100} />
<ScrollButton direction="down" onclick={() => window.scrollTo({ behavior: 'smooth', top: document.documentElement.scrollHeight })} />
