<script lang="ts">
	import '~/app.css';
	import "~/fonts/stylesheet.css";
	import { page } from '$app/state';
	import Header from '@components/Header.svelte';
	import pokeballSvg from '~/assets/pokeball.svg?raw';
	import { onNavigate } from '$app/navigation';
	import { BASE_URL, NO_IMAGES, SITE_NAME } from '~/constants';

	const { title, description, image } = page.data;

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
	<meta name="description" content={description}/>

	<meta name="theme-color" content="#000"/>
	<meta name="color-scheme" content="dark light"/>
	<meta name="robots" content="index, follow"/>
	<meta name="language" content="en"/>
	<meta name="author" content="Ayfri;Anta;Bahsiik"/>
	<meta name="keywords" content="Pokemon, Pokémon, TCG, Card Game, Trading Card Game, Pokemon Cards, Card List, PokéStore"/>

	<meta property="og:site_name" content={SITE_NAME}/>
	<meta property="og:title" content={title}/>
	<meta property="og:description" content={description}/>
	<meta property="og:type" content="website"/>
	<meta property="og:url" content={BASE_URL}/>

	<meta name="viewport" content="width=device-width"/>
	<meta name="twitter:card" content="summary_large_image"/>
	<meta name="twitter:description" content={description}/>
	<meta name="twitter:title" content={title}/>

	{#if image}
		<meta property="og:image" content={image.url}/>
		<meta property="og:image:alt" content={image.alt}/>
		<meta name="twitter:image" content={image.url}/>
		<meta name="twitter:image:alt" content={image.alt}/>
	{/if}

	<link rel="sitemap" href="/sitemap-index.xml"/>
	<link rel="icon" type="image/png" href="/favicon.png"/>
	<link rel="alternate" href={BASE_URL} hreflang="en"/>
	<link rel="alternate" href={BASE_URL} hreflang="x-default"/>

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
		defer
		src="https://static.cloudflareinsights.com/beacon.min.js"
		data-cf-beacon={`{"token": "9409bd4087bd4c07bd6e98a85b1a21c9"}`}
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
