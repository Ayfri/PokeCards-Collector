<script lang="ts">
	import { cardTypeTint, processCardImage } from '$helpers/card-images';
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
		/** Comma-separated energy types, e.g. `"Fire, Water"`: tints the skeleton when the card has no art. */
		types?: string | undefined;
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

	/** 70% of the japanese cards carry no art, so the plate borrows the card's energy colors and mixes them into the gray. */
	const tintStyle = $derived(cardTypeTint(types));

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
	<div class="flex items-center justify-center bg-red-900 text-white rounded-lg {classNames}" style={boxStyle}>
		<span>Image not available</span>
	</div>
{:else if !imageUrl}
	<!-- TCGdex has no art for this card, so nothing will ever replace the plate: it stays still rather than pretending to load. -->
	<div class="card-plate rounded-lg {classNames}" style="{boxStyle}; {tintStyle}">
		<span class="card-plate-label">No artwork</span>
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

<style>
	/* No art exists for these cards, so the plate is built from their energy colors mixed into gray. */
	.card-plate {
		--tint-a: #5a5a5a;
		--tint-b: #2f2f2f;
		align-items: center;
		background-color: color-mix(in oklab, var(--tint-a) 18%, #191919);
		background-image:
			radial-gradient(120% 90% at 20% 0%, color-mix(in oklab, var(--tint-a) 45%, transparent) 0%, transparent 60%),
			radial-gradient(120% 90% at 85% 100%, color-mix(in oklab, var(--tint-b) 55%, transparent) 0%, transparent 65%);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tint-a) 35%, transparent);
		/* The label scales with the tile, so `cqw` needs the plate itself as the query container. */
		container-type: inline-size;
		display: flex;
		justify-content: center;
	}

	.card-plate-label {
		color: rgba(255, 255, 255, 0.45);
		font-size: clamp(0.55rem, 9cqw, 0.85rem);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
</style>
