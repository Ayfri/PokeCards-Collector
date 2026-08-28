<script lang="ts">
	import { processCardImage } from '$helpers/card-images';
	import { NO_IMAGES } from '$lib/images';

	interface Props {
		/** Alt text for the image. */
		alt?: string;
		/** CSS classes to apply to the image. */
		class?: string;
		/** Height of the image, optional if width is specified. */
		height?: number | undefined;
		/** The extensionless TCGdex image base, e.g. "https://assets.tcgdex.net/en/swsh/swsh3/136". */
		imageUrl: string;
		/** Whether the image is lazy loaded. */
		lazy?: boolean;
		/** Caps the candidates at the 245px variant, whatever the layout asks for. */
		lowRes?: boolean;
		/** Called when the image fails to load. */
		onerror?: (event: Event) => void;
		/** Marks the image as above the fold: eager + `fetchpriority="high"`, for the LCP candidate. */
		priority?: boolean;
		/** `sizes` value; defaults to the pixel width when one is given. */
		sizes?: string | undefined;
		/** Inline style of the image. */
		style?: string | undefined;
		/** Width of the image, optional if height is specified. */
		width?: number | undefined;
	}

	let {
		alt = 'Pokemon card',
		class: classNames = '',
		height = undefined,
		imageUrl,
		lazy = true,
		lowRes = false,
		onerror,
		priority = false,
		sizes = undefined,
		style = undefined,
		width = undefined
	}: Props = $props();

	/** Intrinsic widths of the two TCGdex variants: 245x337 (~15 KiB) and 600x825 (~66 KiB). */
	const LOW_WIDTH = 245;
	const HIGH_WIDTH = 600;
	const DEFAULT_FALLBACK_IMAGE = '/default-card-image.png';

	let img = $state<HTMLImageElement>();
	let loaded = $state(false);
	let error = $state(false);

	// assets.tcgdex.net answers with `Access-Control-Allow-Origin: *`, so no proxy is needed.
	const lowResImageUrl = $derived(imageUrl ? processCardImage(imageUrl, 'low') : DEFAULT_FALLBACK_IMAGE);
	const highResImageUrl = $derived(imageUrl ? processCardImage(imageUrl, 'high') : DEFAULT_FALLBACK_IMAGE);

	/** Descriptors must be the real intrinsic widths, otherwise the browser's DPR maths picks the wrong variant. */
	const srcsetValue = $derived(
		NO_IMAGES || !imageUrl
			? undefined
			: lowRes
				? `${lowResImageUrl} ${LOW_WIDTH}w`
				: `${lowResImageUrl} ${LOW_WIDTH}w, ${highResImageUrl} ${HIGH_WIDTH}w`
	);
	const sizesValue = $derived(sizes ?? (width ? `${width}px` : '(max-width: 768px) 50vw, 300px'));

	function handleError(event: Event) {
		error = true;
		onerror?.(event);
	}

	/** A recycled tile keeps its <img> element, so a cached src is already complete: skip the fade instead of flashing. */
	$effect(() => {
		lowResImageUrl;
		error = false;
		loaded = img?.complete ?? false;
	});
</script>

{#if error}
	<div class="flex items-center justify-center bg-red-900 text-white rounded-lg {classNames}" style="{style || ''} {width ? `width: ${width}px;` : ''} {height ? `height: ${height}px;` : ''}">
		<span>Image not available</span>
	</div>
{:else}
	<img
		bind:this={img}
		{alt}
		class="transition-opacity duration-300 ease-in-out {classNames} {loaded ? '' : 'opacity-0'} {NO_IMAGES ? 'border border-gold-400/50' : ''}"
		decoding="async"
		draggable="false"
		fetchpriority={priority ? 'high' : 'auto'}
		{height}
		loading={priority || !lazy ? 'eager' : 'lazy'}
		onerror={handleError}
		onload={() => (loaded = true)}
		sizes={sizesValue}
		src={lowRes ? lowResImageUrl : highResImageUrl}
		srcset={srcsetValue}
		{style}
		{width}
	/>
{/if}
