<script lang="ts">
	import { page } from '$app/state';
	import { BASE_URL, SITE_NAME, SITE_TWITTER } from '~/constants';
	import { organizationSchema } from '$helpers/seo';
	import type { Breadcrumb, Image, SeoType } from '$lib/types';

	const SITE_DESCRIPTION = 'Explore and manage your Pokémon TCG collection. Browse, search, and filter through a comprehensive list of Pokémon TCG cards.';

	/** `og:type` is a closed vocabulary, so the schema.org type a page declares is mapped onto the nearest OG value. */
	const OG_TYPES: Record<SeoType, string> = {
		Article: 'article',
		CollectionPage: 'website',
		ItemPage: 'website',
		ProfilePage: 'profile',
		Product: 'product',
		WebPage: 'website',
		WebSite: 'website',
	};

	interface Props {
		breadcrumbs?: Breadcrumb[];
		canonicalUrl?: string | null;
		description?: string;
		image?: Image | null;
		keywords?: string[];
		/** Utility pages (auth flows, redirects, anything user-owned and private) stay out of the index. */
		noindex?: boolean;
		/** Extra JSON-LD nodes merged into the page `@graph`: a `Product` for a card, an `ItemList` for a grid, ... */
		schemas?: Record<string, unknown>[];
		title?: string;
		type?: SeoType;
	}

	let {
		breadcrumbs = [],
		canonicalUrl = null,
		description = SITE_DESCRIPTION,
		image = null,
		keywords = [],
		noindex = false,
		schemas = [],
		title = SITE_NAME,
		type = 'WebPage',
	}: Props = $props();

	/** Crawlers reject relative `og:image` / `@id` values, and every URL in the graph has to resolve on its own. */
	function absolute(url: string): string {
		return /^https?:\/\//.test(url) ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
	}

	// The suffix is skipped whenever the brand is already in the title, wherever it sits: a page naming itself
	// "PokeCards-Collector - ..." would otherwise ship the brand twice in one title.
	const effectiveTitle = $derived(
		title.trim().toLowerCase().includes(SITE_NAME.toLowerCase())
			? title.trim()
			: `${title.trim()} - ${SITE_NAME}`
	);
	// The canonical drops the query string: `?set=`, `?page=` and friends are filters over the same document.
	const effectiveCanonicalUrl = $derived(canonicalUrl ? absolute(canonicalUrl) : `${BASE_URL}${page.url.pathname}`);
	const imageUrl = $derived(image?.url ? absolute(image.url) : null);
	const ogType = $derived(OG_TYPES[type]);
	const robots = $derived(noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

	const websiteNode = {
		'@id': `${BASE_URL}/#website`,
		'@type': 'WebSite',
		description: SITE_DESCRIPTION,
		inLanguage: 'en',
		name: SITE_NAME,
		publisher: { '@id': `${BASE_URL}/#organization` },
		potentialAction: {
			'@type': 'SearchAction',
			'query-input': 'required name=search_term_string',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${BASE_URL}/cards-list?name={search_term_string}`,
			},
		},
		url: BASE_URL,
	};

	const breadcrumbNode = $derived(breadcrumbs.length ? {
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			item: absolute(crumb.url),
			name: crumb.name,
			position: index + 1,
		})),
	} : null);

	// A `@graph` entry is a page or a thing, never both: a `Product` page publishes an `ItemPage` node whose
	// `mainEntity` points at the `Product` node the load built, rather than typing the page itself as a product.
	const mainEntityId = $derived(schemas.find(schema => typeof schema['@id'] === 'string')?.['@id'] as string | undefined);

	const pageNode = $derived({
		'@id': `${effectiveCanonicalUrl}#page`,
		'@type': type === 'WebSite' ? 'WebPage' : type === 'Product' ? 'ItemPage' : type,
		...(mainEntityId && { mainEntity: { '@id': mainEntityId } }),
		description,
		inLanguage: 'en',
		isPartOf: { '@id': `${BASE_URL}/#website` },
		name: effectiveTitle,
		url: effectiveCanonicalUrl,
		...(imageUrl && { primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl } }),
		...(breadcrumbNode && { breadcrumb: breadcrumbNode }),
	});

	// A closing script tag inside a card or artist name would end the tag this JSON is inlined into, so every `<` is
	// re-encoded. Both sides are written as escapes because a literal `<` in a Svelte script block is a parse error.
	const jsonLdString = $derived(JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [organizationSchema(), websiteNode, pageNode, ...schemas],
	}).replaceAll('\u003c', '\u003c'));
</script>

<svelte:head>
	<title>{effectiveTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={effectiveCanonicalUrl} />
	{#if keywords.length}
		<meta name="keywords" content={keywords.join(', ')} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:title" content={effectiveTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={effectiveCanonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={ogType} />
	<meta property="og:locale" content="en_US" />
	{#if imageUrl && image}
		<meta property="og:image" content={imageUrl} />
		<meta property="og:image:alt" content={image.alt} />
		{#if image.width && image.height}
			<meta property="og:image:width" content={String(image.width)} />
			<meta property="og:image:height" content={String(image.height)} />
		{/if}
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:site" content={SITE_TWITTER} />
	<meta name="twitter:creator" content={SITE_TWITTER} />
	<meta name="twitter:title" content={effectiveTitle} />
	<meta name="twitter:description" content={description} />
	{#if imageUrl && image}
		<meta name="twitter:image" content={imageUrl} />
		<meta name="twitter:image:alt" content={image.alt} />
	{/if}

	<meta name="robots" content={robots} />

	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">${jsonLdString}</script>`}
</svelte:head>
