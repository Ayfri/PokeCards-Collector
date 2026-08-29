<script lang="ts">
	import { page } from '$app/state';
	import PageTitle from '@components/PageTitle.svelte';
	import House from '@lucide/svelte/icons/house';
	import SearchX from '@lucide/svelte/icons/search-x';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let ready = $state(false);
	onMount(() => {
		ready = true;
	});

	const errorStatus = $derived(page.status);
	const errorMessage = $derived(page.error?.message);

	const displayTitle = $derived(errorStatus === 404 ? '404 - Page Not Found' : `Error ${errorStatus}`);
	const displayMessage = $derived(errorStatus === 404
		? "Looks like this page used Teleport, and it failed!"
		: errorMessage || 'Something went wrong on our end. Please try again later.');
</script>

{#if ready}
	<main
		class="container mx-auto flex min-h-[calc(100svh-200px)] flex-col items-center justify-center px-4 py-8 text-center text-white"
		in:fade={{ duration: 300, delay: 100 }}
	>
		<div in:fly={{ y: 20, duration: 400, delay: 200 }} class="mb-8" title={displayTitle}>
			{#if errorStatus === 404}
				<SearchX size={64} class="mx-auto text-gold-400" />
			{:else}
				<TriangleAlert size={64} class="mx-auto text-gold-400" />
			{/if}
		</div>

		<div in:fly={{ y: 20, duration: 400, delay: 300 }}>
			<PageTitle title={displayTitle} />
		</div>

		<p class="mb-8 mt-4 max-w-md text-lg text-gray-300" in:fly={{ y: 20, duration: 400, delay: 400 }}>
			{displayMessage}
		</p>

		<a
			href="/"
			class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded-sm border-2 border-gold-400 px-6 py-2.5 text-sm font-medium text-gold-400 transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-gray-900"
			in:fly={{ y: 20, duration: 400, delay: 500 }}
			title="Back to the home page"
		>
			<House size={18} />
			Go to Homepage
		</a>
	</main>
{/if}
