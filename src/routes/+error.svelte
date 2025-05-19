<script lang="ts">
	import { page } from '$app/stores'; // SvelteKit v1 used $app/stores, modern SvelteKit uses $app/state
	import PageTitle from '@components/PageTitle.svelte';
	import { Home, AlertTriangle } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	// According to user instructions, $app/stores might be deprecated for $app/state.
	// However, for error objects, $page.error from $app/stores is the standard way.
	// If $app/state is preferred, this might need adjustment based on how error info is exposed there.

	let ready = false;
	onMount(() => {
		ready = true;
	});

	$: errorStatus = $page.status;
	$: errorMessage = $page.error?.message;

	let displayTitle = '';
	let displayMessage = '';

	$: {
		if (errorStatus === 404) {
			displayTitle = '404 - Page Not Found';
			displayMessage = errorMessage || "Oops! The page you're looking for doesn't seem to exist.";
		} else {
			displayTitle = `Error ${errorStatus}`;
			displayMessage = errorMessage || 'Something went wrong on our end. Please try again later.';
		}
	}
</script>

<svelte:head>
	<title>{displayTitle} - PokéCards Collector</title>
	<meta name="description" content={displayMessage} />
</svelte:head>

{#if ready}
	<main
		class="container mx-auto flex min-h-[calc(100svh-200px)] flex-col items-center justify-center px-4 py-8 text-center text-white"
		in:fade={{ duration: 300, delay: 100 }}
	>
		<div in:fly={{ y: 20, duration: 400, delay: 200 }} class="mb-8">
			<AlertTriangle size={64} class="mx-auto text-gold-400" />
		</div>

		<div in:fly={{ y: 20, duration: 400, delay: 300 }}>
			<PageTitle title={displayTitle} />
		</div>

		<p class="mb-8 mt-4 max-w-md text-lg text-gray-300" in:fly={{ y: 20, duration: 400, delay: 400 }}>
			{displayMessage}
		</p>

		<a
			href="/"
			class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded border-2 border-gold-400 px-6 py-2.5 text-sm font-medium text-gold-400 transition-all duration-300 hover:bg-gold-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-gray-900"
			in:fly={{ y: 20, duration: 400, delay: 500 }}
		>
			<Home size={18} />
			Go to Homepage
		</a>
	</main>
{/if}

<style>
	/* Ensuring global styles like body background are implicitly handled by layout or app.css */
	/* Styles from profile page for buttons, could be centralized if used often */
	.animated-hover-button::before {
		content: "";
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 215, 0, 0.3),
			transparent
		);
		transition: left 0.5s ease-in-out;
		z-index: 0;
	}

	.animated-hover-button:hover::before {
		left: 100%;
	}

	.animated-hover-button span {
		position: relative;
		z-index: 1;
	}

	/* Add min-height to ensure footer (if any) is pushed down */
	/* The main tag already has a min-height style */
</style>
