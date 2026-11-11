<script lang="ts">
	import '#src/app.css';
	import '#src/fonts/stylesheet.css';
	import {onNavigate} from '$app/navigation';
	import {page} from '$app/state';
	import {untrack} from 'svelte';
	import {NO_IMAGES} from '#helpers/card-images.ts';
	import {transitionNavigation} from '#helpers/view-transitions.ts';
	import Footer from '#components/Footer.svelte';
	import Header from '#components/Header.svelte';
	import LoadingBar from '#lib/components/ui/LoadingBar.svelte';
	import Seo from '#lib/components/seo/Seo.svelte';
	import { loading } from '#stores/loading.svelte.ts';
	import { wishlist } from '#stores/wishlist.svelte.ts';
	import { collection } from '#stores/collection.svelte.ts';
	import pokecardsCollector from '#src/assets/pokecards-collector.png';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	/** These pages fit their card grid or the binder builder inside exactly one viewport, so the footer sits below the fold instead of taking their height. */
	const FULL_VIEWPORT_ROUTES = new Set(['/binder', '/cards-list', '/[grid=catalogueGrid]', '/[[grid=catalogueGrid]]/sets/[setSlug]', '/collection/[user]', '/wishlist/[user]']);
	const fullViewport = $derived(FULL_VIEWPORT_ROUTES.has(page.route.id ?? ''));

	/** A stable reference for "no list", so the derived arrays below only change when the layout load returns new ones. */
	const EMPTY: readonly never[] = Object.freeze([]);

	/**
	 * `page.data` is a new object on every client navigation while the layout load does not re-run, so the effect reads the two arrays through
	 * `$derived`: it only re-runs when the load returned new lists, and a copy added with "+" survives navigation. `replaceAll` reads the stores
	 * it writes, so it runs untracked: tracked, a "+" would re-run this effect and reset the store to the load's list.
	 */
	const wishlistCodes = $derived((page.data.wishlistCodes ?? EMPTY) as readonly string[]);
	const collectionCodes = $derived((page.data.collectionCodes ?? EMPTY) as readonly string[]);

	$effect(() => {
		const wishlisted = [...wishlistCodes];
		const collected = [...collectionCodes];
		untrack(() => {
			wishlist.replaceAll(wishlisted);
			collection.replaceAll(collected);
		});
	});

	/** Arms the loading bar as soon as an internal link is clicked, before SvelteKit starts the navigation. */
	function handleLinkClick(event: MouseEvent) {
		const link = (event.target as HTMLElement).closest('a');
		if (
			!link?.href
			/** A link whose own handler took the click over (a related print swapped in place) never navigates. */
			|| event.defaultPrevented
			|| link.origin !== window.location.origin
			|| link.hasAttribute('target')
			|| link.hasAttribute('download')
			|| event.ctrlKey || event.metaKey || event.shiftKey
			/** A hash link on the current page only scrolls, it does not navigate. */
			|| (link.pathname === window.location.pathname && link.hash)
		) return;

		loading.navigation = true;
	}

	onNavigate((navigation) => {
		/** Only our own shallow `goto` (a related card pick) skips the transition: a Back into that entry is `shallow` too, but a real navigation. */
		if (navigation.shallow && navigation.type === 'goto') return;

		loading.navigation = true;

		navigation.complete.then(() => {
			/** The short delay keeps the bar from flickering off between quick transitions. */
			setTimeout(() => (loading.navigation = false), 100);
		});

		return transitionNavigation(navigation);
	});
</script>

<svelte:document onclick={handleLinkClick} />

<svelte:head>
	<meta content="Ayfri;Anta;Bahsiik" name="author"/>

	<!-- No site-wide hreflang: the site is English-only, and alternates pointing every page at the homepage told crawlers the homepage was each page's English version. -->
	<link href="/sitemap.xml" rel="sitemap"/>

	<!-- Card art, sprites and analytics sit on third-party origins that the first paint needs, so the connections open early. -->
	<link crossorigin="anonymous" href="https://assets.tcgdex.net" rel="preconnect"/>
	<link crossorigin="anonymous" href="https://cdn.jsdelivr.net" rel="preconnect"/>
	<link href="https://www.googletagmanager.com" rel="dns-prefetch"/>

	<!-- About 97% of the Google Analytics users of Sep-Oct 2026 were headless browsers from AWS data centres, so gtag never loads when `navigator.webdriver` is set. -->
	<script>
		if (!navigator.webdriver) {
			window.dataLayer = window.dataLayer || [];

			function gtag() {
				dataLayer.push(arguments);
			}

			gtag('js', new Date());
			gtag('config', 'G-PS0GZ8MEB8');

			const gtagScript = document.createElement('script');
			gtagScript.async = true;
			gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-PS0GZ8MEB8';
			/* Not into the head: a node added here sits among the head elements Svelte hydrates, which made hydration fail and the whole page render again. */
			document.documentElement.appendChild(gtagScript);
		}
	</script>

	<script
		data-cf-beacon={`{"token": "9409bd4087bd4c07bd6e98a85b1a21c9"}`}
		defer
		src="https://static.cloudflareinsights.com/beacon.min.js"
	></script>
</svelte:head>
<Seo
	breadcrumbs={page.data.breadcrumbs}
	canonical={page.data.canonical}
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
	<main class={['flex min-h-0 grow flex-col pt-24', fullViewport ? 'h-dvh shrink-0 overflow-y-auto' : 'lg:pt-32']}>
		{@render children?.()}
	</main>
	<!-- The Guess the Price board fills exactly one viewport, so a footer under it would only add a scrollbar. -->
	{#if page.route.id !== '/guess-the-price'}
		<Footer />
	{/if}
	<div class="fixed top-[15%] [filter:grayscale(100%)_opacity(0.05)_contrast(3)_brightness(0.5)] -z-50 flex place-content-center h-lvh w-[95%] max-lg:left-[2.5%] lg:w-full {NO_IMAGES ? 'hidden' : ''}">
		<!-- A watermark at 5% opacity: it carries no content, so an empty alt keeps it out of the accessibility tree. -->
		<img alt="" aria-hidden="true" class="absolute w-1/2" src={pokecardsCollector} />
	</div>
</div>
