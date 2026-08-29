<script lang="ts">
	import '~/app.css';
	import "~/fonts/stylesheet.css";
	import {onNavigate} from '$app/navigation';
	import {page} from '$app/state';
	import {NO_IMAGES} from '$lib/images';
	import Header from '@components/Header.svelte';
	import LoadingBar from '$lib/components/ui/LoadingBar.svelte';
	import {BASE_URL} from '~/constants';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { loading } from '$stores/loading.svelte';
	import { wishlist } from '$stores/wishlist.svelte';
	import { collection } from '$stores/collection.svelte';
	import type { UserWishlist, UserCollection } from '$lib/types';
	import pokestore from '~/assets/pokecards-collector.png';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	/** The layout load hands both lists down on every navigation, so the client mirrors stay in step with the session. */
	$effect(() => {
		wishlist.replaceAll(((page.data.wishlistItems ?? []) as UserWishlist[]).map(item => item.card_code));
		collection.replaceAll(((page.data.collectionItems ?? []) as UserCollection[]).map(item => item.card_code));
	});

	/** Arms the loading bar as soon as an internal link is clicked, before SvelteKit starts the navigation. */
	function handleLinkClick(event: MouseEvent) {
		const link = (event.target as HTMLElement).closest('a');
		if (
			!link?.href
			|| link.origin !== window.location.origin
			|| link.hasAttribute('target')
			|| link.hasAttribute('download')
			|| event.ctrlKey || event.metaKey || event.shiftKey
			// A hash on the current page scrolls, it does not navigate.
			|| (link.pathname === window.location.pathname && link.hash)
		) return;

		loading.navigation = true;
	}

	onNavigate((navigation) => {
		loading.navigation = true;

		navigation.complete.then(() => {
			setTimeout(() => (loading.navigation = false), 100); // Small delay to ensure smoother transitions
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

<svelte:document onclick={handleLinkClick} />

<svelte:head>
	<meta content="#000" name="theme-color"/>
	<meta content="dark light" name="color-scheme"/>
	<meta content="Ayfri;Anta;Bahsiik" name="author"/>

	<link href="/sitemap.xml" rel="sitemap"/>
	{#if !NO_IMAGES}
	<link href="/favicon.png" rel="icon" type="image/png"/>
	{/if}
	<link href={BASE_URL} hreflang="en" rel="alternate"/>
	<link href={BASE_URL} hreflang="x-default" rel="alternate"/>

	<!-- Card art, sprites and the analytics beacons all sit on third-party origins the first paint needs. -->
	<link href="https://assets.tcgdex.net" rel="preconnect" crossorigin="anonymous"/>
	<link href="https://cdn.jsdelivr.net" rel="preconnect" crossorigin="anonymous"/>
	<link href="https://www.googletagmanager.com" rel="dns-prefetch"/>

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
</svelte:head>
<Seo
	breadcrumbs={page.data.breadcrumbs}
	description={page.data.description}
	image={page.data.image}
	keywords={page.data.keywords}
	noindex={page.data.noindex}
	schemas={page.data.schemas}
	title={page.data.title}
	type={page.data.type ?? (page.url.pathname === '/' ? 'WebSite' : 'WebPage')}
/>

<div class="flex flex-col min-h-screen">
	<LoadingBar />
	<Header />
	<main class="grow pt-24 lg:pt-32">
		{@render children?.()}
	</main>
	<div class="fixed top-[15%] [filter:grayscale(100%)_opacity(0.05)_contrast(3)_brightness(0.5)] -z-50 flex place-content-center h-lvh w-[95%] max-lg:left-[2.5%] lg:w-full {NO_IMAGES ? 'hidden' : ''}">
		<img src={pokestore} alt="Background" class="absolute w-1/2" />
	</div>
</div>
