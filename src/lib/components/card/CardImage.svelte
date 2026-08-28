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

	/** Own speed and phase per instance, so a grid of skeletons sweeps out of sync instead of blinking in lockstep. */
	const shimmerStyle = `--shimmer-duration: ${(1.7 + Math.random() * 1.6).toFixed(2)}s; --shimmer-delay: -${(Math.random() * 3).toFixed(2)}s`;

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
	<!-- No art for this card: a skeleton box costs no request, unlike a placeholder file. -->
	<div class="card-skeleton rounded-lg {classNames}" style="{boxStyle}; {shimmerStyle}"></div>
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
	/* Gold sweep over a card-shaped plate: the highlight travels, the plate never flashes. */
	.card-skeleton {
		background-color: #232323;
		background-image: linear-gradient(
			105deg,
			transparent 30%,
			rgba(251, 197, 74, 0.07) 42%,
			rgba(251, 197, 74, 0.16) 50%,
			rgba(251, 197, 74, 0.07) 58%,
			transparent 70%
		);
		background-repeat: no-repeat;
		background-size: 250% 100%;
		box-shadow: inset 0 0 0 1px rgba(251, 197, 74, 0.12);
		animation: card-skeleton-sweep var(--shimmer-duration, 2s) var(--shimmer-delay, 0s) cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes card-skeleton-sweep {
		from { background-position: 150% 0; }
		to { background-position: -50% 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.card-skeleton {
			animation: none;
			background-position: 50% 0;
		}
	}
</style>
