<script lang="ts">
	import { page } from '$app/state';
	import { BASE_URL, SITE_NAME, SITE_TWITTER } from '#src/constants.ts';
	import { inlineJson, organizationSchema } from '#helpers/seo.ts';
	import type { Breadcrumb, Image, SeoType } from '#lib/types.js';

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
		/** Root-relative canonical for a page whose request path is not its document's URL: a `?set=` grid points at the set page (`/sets/151`), a card at its own slug. Defaults to the bare path. */
		canonical?: string;
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
		canonical,
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

	/** The site name suffix is skipped when the brand is already anywhere in the title, so a page named "PokeCards-Collector - ..." does not repeat it. */
	const effectiveTitle = $derived(
		title.trim().toLowerCase().includes(SITE_NAME.toLowerCase())
			? title.trim()
			: `${title.trim()} - ${SITE_NAME}`
	);
	/**
	 * The canonical drops the query string unless the load names one: sorts and secondary filters only rearrange the same document,
	 * while a `?set=` grid that still renders (it combines filters, so it is not redirected) names the set page as its canonical.
	 */
	const effectiveCanonicalUrl = $derived(`${BASE_URL}${canonical ?? page.url.pathname}`);
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

	/** A `@graph` entry is a page or a thing, never both: a `Product` page publishes an `ItemPage` node whose `mainEntity` points at the load's `Product` node. */
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

	const jsonLdString = $derived(inlineJson({
		'@context': 'https://schema.org',
		'@graph': [organizationSchema(), websiteNode, pageNode, ...schemas],
	}));
</script>

<svelte:head>
	<title>{effectiveTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={effectiveCanonicalUrl} />
	{#if keywords.length}
		<meta name="keywords" content={keywords.join(', ')} />
	{/if}

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

	{@html `<script type="application/ld+json">${jsonLdString}</script>`}
</svelte:head>
