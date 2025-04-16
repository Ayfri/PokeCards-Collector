<script lang="ts">
	import '~/app.css';
	import "~/fonts/stylesheet.css";
	import {onNavigate} from '$app/navigation';
	import {page} from '$app/state';
	import {NO_IMAGES} from '$lib/images';
	import Header from '@components/Header.svelte';
	import pokeballSvg from '~/assets/pokeball.svg?raw';
	import {BASE_URL, SITE_NAME} from '~/constants';

	const {
		title,
		description,
		image,
	} = page.data;

	onNavigate((navigation) => {
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
	<meta content={description} name="description"/>

	<meta content="#000" name="theme-color"/>
	<meta content="dark light" name="color-scheme"/>
	<meta content="index, follow" name="robots"/>
	<meta content="en" name="language"/>
	<meta content="Ayfri;Anta;Bahsiik" name="author"/>
	<meta content="Pokemon, Pokémon, TCG, Card Game, Trading Card Game, Pokemon Cards, Card List, PokéStore" name="keywords"/>

	<meta content={SITE_NAME} property="og:site_name"/>
	<meta content={title} property="og:title"/>
	<meta content={description} property="og:description"/>
	<meta content="website" property="og:type"/>
	<meta content={BASE_URL} property="og:url"/>

	<meta content="width=device-width" name="viewport"/>
	<meta content="summary_large_image" name="twitter:card"/>
	<meta content={description} name="twitter:description"/>
	<meta content={title} name="twitter:title"/>

	{#if image}
		<meta property="og:image" content={image.url}/>
		<meta property="og:image:alt" content={image.alt}/>
		<meta name="twitter:image" content={image.url}/>
		<meta name="twitter:image:alt" content={image.alt}/>
	{/if}

	<link href="/sitemap-index.xml" rel="sitemap"/>
	<link href="/favicon.png" rel="icon" type="image/png"/>
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

	<title>{title}</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
	<Header/>
	<slot/>
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
