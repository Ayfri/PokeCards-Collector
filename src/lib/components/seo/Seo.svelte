<script lang="ts">
	import { page } from '$app/state';
	import { BASE_URL, SITE_NAME } from '~/constants';
	import type { Image } from '$lib/types';

	// Define the static site description
	const SITE_DESCRIPTION = 'Explore and manage your Pokémon TCG collection. Browse, search, and filter through a comprehensive list of Pokémon TCG cards.';

	export let title: string = SITE_NAME; // Default title
	export let description: string = SITE_DESCRIPTION; // Default description updated
	export let image: Image | null = null;
	export let canonicalUrl: string | null = null;
	export let type: 'WebSite' | 'WebPage' | 'Article' | 'Product' = 'WebPage'; // Default type

	$: effectiveTitle =
		title.trim().toLowerCase().endsWith(SITE_NAME.toLowerCase())
			? title.trim()
			: `${title.trim()} - ${SITE_NAME}`;
	$: effectiveCanonicalUrl = canonicalUrl ?? `${BASE_URL}${page.url.pathname}${page.url.search}`;

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': type,
		name: effectiveTitle,
		description: description,
		url: effectiveCanonicalUrl,
		...(image && { image: image.url }),
		...(type === 'WebSite' && {
			potentialAction: {
				'@type': 'SearchAction',
				target: {
					'@type': 'EntryPoint',
					urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
				},
				'query-input': 'required name=search_term_string',
			},
		}),
		...(type === 'WebPage' && {
			isPartOf: {
				'@type': 'WebSite',
				description: SITE_DESCRIPTION, // Add static site description here
				name: SITE_NAME,
				url: BASE_URL,
			},
		}),
	};

	const jsonLdString = JSON.stringify(jsonLd, null, 2);
</script>

<svelte:head>
	<title>{effectiveTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={effectiveCanonicalUrl} />

	<!-- Open Graph -->
	<meta property="og:title" content={effectiveTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={effectiveCanonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={type.toLowerCase()} />
	{#if image}
		<meta property="og:image" content={image.url} />
		<meta property="og:image:alt" content={image.alt} />
		<!-- You might want to add og:image:width and og:image:height if available -->
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={effectiveTitle} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta name="twitter:image" content={image.url} />
		<meta name="twitter:image:alt" content={image.alt} />
	{/if}

	<!-- Other relevant meta tags -->
	<meta name="robots" content="index, follow" />

	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">${jsonLdString}</script>`}
</svelte:head>
