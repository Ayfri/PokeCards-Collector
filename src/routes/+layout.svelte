<script lang="ts">
	import '~/app.css';
	import "~/fonts/stylesheet.css";
	import {onNavigate} from '$app/navigation';
	import {page} from '$app/state';
	import {NO_IMAGES} from '$lib/images';
	import Header from '@components/Header.svelte';
	import LoadingBar from '$lib/components/ui/LoadingBar.svelte';
	import pokeballSvg from '~/assets/pokeball.svg?raw';
	import {BASE_URL} from '~/constants';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { setNavigationLoading } from '$lib/stores/loading';
	import { onMount } from 'svelte';
	import { wishlistStore } from '$lib/stores/wishlist';
	import { collectionStore } from '$lib/stores/collection';
	import type { UserWishlist, UserCollection } from '$lib/types';

	// Access all data from the page state
	$: ({title, description, image, user, profile, wishlistItems, collectionItems} = page.data);

	// Reactive statement to update stores when server data changes
	$: {
		// Update wishlist store
		const wishlistSet = new Set<string>();
		if (wishlistItems && Array.isArray(wishlistItems)) {
			(wishlistItems as UserWishlist[]).forEach(item => wishlistSet.add(item.card_code));
		}
		wishlistStore.set(wishlistSet);

		// Update collection store
		const collectionMap = new Map<string, number>();
		if (collectionItems && Array.isArray(collectionItems)) {
			(collectionItems as UserCollection[]).forEach(item => {
				const currentCount = collectionMap.get(item.card_code) || 0;
				collectionMap.set(item.card_code, currentCount + 1);
			});
		}
		collectionStore.set(collectionMap);
	}

	// Capture clicks on links before navigation starts
	onMount(() => {
		const handleLinkClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest('a');

			// Check if it's an internal link
			if (
				link &&
				link.href &&
				link.origin === window.location.origin &&
				!link.hasAttribute('target') &&
				!link.hasAttribute('download') &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey
			) {
				setNavigationLoading(true);
			}
		};

		document.addEventListener('click', handleLinkClick);

		return () => {
			document.removeEventListener('click', handleLinkClick);
		};
	});

	onNavigate((navigation) => {
		// Loading already started on link click
		// Just make sure it's set to true
		setNavigationLoading(true);

		// Set up to turn loading off after navigation completes
		navigation.complete.then(() => {
			setTimeout(() => setNavigationLoading(false), 100); // Small delay to ensure smoother transitions
		});

		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<meta charset="UTF-8"/>

	<meta content="#000" name="theme-color"/>
	<meta content="dark light" name="color-scheme"/>
	<meta content="en" name="language"/>
	<meta content="Ayfri;Anta;Bahsiik" name="author"/>
	<meta content="Pokemon, Pokémon, TCG, Card Game, Trading Card Game, Pokemon Cards, Card List, PokéStore, PokéCards-Collector" name="keywords"/>

	<meta content="width=device-width" name="viewport"/>

	<link href="/sitemap-index.xml" rel="sitemap"/>
	{#if !NO_IMAGES}
	<link href="/favicon.png" rel="icon" type="image/png"/>
	{/if}
	<link href={BASE_URL} hreflang="en" rel="alternate"/>
	<link href={BASE_URL} hreflang="x-default" rel="alternate"/>

	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-PS0GZ8MEB8"></script>
	<script>
		window.dataLayer = window.dataLayer || [];

		function gtag() {
			dataLayer.push(arguments);
		}

		gtag('js', new Date());
		gtag('config', 'G-PS0GZ8MEB8');
	</script>

	<!-- Cloudflare Web Analytics -->
	<script
		data-cf-beacon={`{"token": "9409bd4087bd4c07bd6e98a85b1a21c9"}`}
		defer
		src="https://static.cloudflareinsights.com/beacon.min.js"
	></script>
	<!-- End Cloudflare Web Analytics -->
	<!-- <ViewTransitions fallback="animate"/> -->
</svelte:head>
<Seo {title} {description} {image} type={page.url.pathname === '/' ? 'WebSite' : 'WebPage'} />

<div class="flex flex-col min-h-screen">
	<LoadingBar />
	<Header />
	<main class="flex-grow pt-24 lg:pt-32">
		<slot/>
	</main>
	<div class="background fixed top-[15%] -z-50 flex place-content-center h-[100lvh] w-[95%] max-lg:left-[2.5%] lg:w-full {NO_IMAGES ? 'hidden' : ''}">
		{@html pokeballSvg}
	</div>
</div>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.background {
		filter: invert(9%) sepia(2%) saturate(12%) hue-rotate(332deg) brightness(54%) contrast(88%);
	}
</style>
