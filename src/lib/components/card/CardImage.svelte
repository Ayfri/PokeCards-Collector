<script lang="ts">
	import { processCardImage } from '$helpers/card-images';
	import CardPlate from '@components/card/CardPlate.svelte';
	import { NO_IMAGES } from '$lib/images';
	import type { FullCard } from '$lib/types';
	import { untrack } from 'svelte';

	interface Props {
		/** Alt text for the image. */
		alt?: string;
		/** The depicted card: the plate drawn in place of a missing scan shows its details. */
		card?: FullCard | undefined;
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
		/** Called when the image fails to load, including a failure that happened before hydration. */
		onerror?: () => void;
		/** Marks the image as above the fold: eager + `fetchpriority="high"`, for the LCP candidate. */
		priority?: boolean;
		/** `sizes` value; defaults to the pixel width when one is given. */
		sizes?: string | undefined;
		/** Inline style of the image. */
		style?: string | undefined;
		/** Comma-separated energy types, e.g. `"Fire, Water"`: tints the plate when the card has no art and no `card` is given. */
		types?: string | undefined;
		/** Width of the image, optional if height is specified. */
		width?: number | undefined;
	}

	let {
		alt = 'Pokemon card',
		card = undefined,
		class: classNames = '',
		height = undefined,
		imageUrl,
		lazy = true,
		lowRes = false,
		onerror,
		priority = false,
		sizes = undefined,
		style = undefined,
		types = undefined,
		width = undefined
	}: Props = $props();

	/** Intrinsic widths of the two TCGdex variants: 245x337 (~15 KiB) and 600x825 (~66 KiB). */
	const LOW_WIDTH = 245;
	const HIGH_WIDTH = 600;

	let img = $state<HTMLImageElement>();
	let loaded = $state(false);
	let error = $state(false);

	// assets.tcgdex.net answers with `Access-Control-Allow-Origin: *`, so no proxy is needed.
	const lowResImageUrl = $derived(processCardImage(imageUrl, 'low'));
	const highResImageUrl = $derived(processCardImage(imageUrl, 'high'));

	/** Descriptors must be the real intrinsic widths, otherwise the browser's DPR maths picks the wrong variant. */
	const srcsetValue = $derived(
		NO_IMAGES || !imageUrl
			? undefined
			: lowRes
				? `${lowResImageUrl} ${LOW_WIDTH}w`
				: `${lowResImageUrl} ${LOW_WIDTH}w, ${highResImageUrl} ${HIGH_WIDTH}w`
	);
	const sizesValue = $derived(sizes ?? (width ? `${width}px` : '(max-width: 768px) 50vw, 300px'));
	/** Card art is 245x337, so a box with no explicit size still reserves the right space. */
	const boxStyle = $derived(
		[style, width && `width: ${width}px`, height && `height: ${height}px`, !(width && height) && 'aspect-ratio: 245 / 337'].filter(Boolean).join('; ')
	);

	function handleError() {
		error = true;
		onerror?.();
	}

	/**
	 * A recycled tile keeps its <img> element, so a cached src is already complete: skip the fade instead of flashing.
	 * A server-rendered <img> can also fail before hydration attaches `onerror`, which only this check catches.
	 * `img` is read untracked: a failed load swaps it for the plate, and re-running on that reset `error` and looped forever.
	 */
	$effect(() => {
		lowResImageUrl;
		untrack(() => {
			const settled = img?.complete ?? false;
			loaded = settled && img?.naturalWidth !== 0;
			if (settled && !loaded) handleError();
			else error = false;
		});
	});
</script>

{#if error || !imageUrl}
	<!-- No art, or a URL TCGdex lists before uploading the scan (404): the plate stays still rather than pretending to load. -->
	<CardPlate {alt} {card} class="rounded-lg {classNames}" style={boxStyle} {types} />
{:else}
	<img
		bind:this={img}
		{alt}
		class="transition-opacity duration-300 ease-in-out {classNames} {loaded ? '' : 'opacity-0'} {NO_IMAGES ? 'border border-gold-400/50' : ''}"
		data-card-code={card?.cardCode}
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
