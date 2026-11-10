<script lang="ts">
	import { NO_IMAGES, processCardImage, scanWidths } from '#helpers/card-images.ts';
	import CardPlate from '#components/card/CardPlate.svelte';
	import type { PlateCard, PlateSet } from '#lib/types.js';
	import { untrack } from 'svelte';

	interface Props {
		alt?: string;
		/** The depicted card: the plate drawn in place of a missing scan shows its details. */
		card?: PlateCard | undefined;
		class?: string;
		height?: number | undefined;
		/** The extensionless TCGdex image base, e.g. "https://assets.tcgdex.net/en/swsh/swsh3/136", or a CardTrader scan URL. */
		imageUrl: string;
		lazy?: boolean;
		/** Caps the candidates at the low variant (245 px, or 500 px for a CardTrader scan), whatever the layout asks for. */
		lowRes?: boolean;
		/** Called when the image fails to load, including a failure that happened before hydration. */
		onerror?: () => void;
		/** Width in px the plate drawn in place of a missing scan is laid out at before it is scaled into the box: a small slot keeps the full plate instead of the collapsed one. */
		plateWidth?: number | undefined;
		/** Marks the image as above the fold: eager + `fetchpriority="high"`, for the LCP candidate. */
		priority?: boolean;
		/** The card's set when the caller already holds it: the plate drawn in place of a missing scan shows its symbol and the card's `n/total` number. */
		set?: PlateSet | undefined;
		/** `sizes` value; defaults to the pixel width when one is given. */
		sizes?: string | undefined;
		style?: string | undefined;
		/** The name the plate prints in its header when the caller shows another one than `card.name`, such as the Pokédex species name of a Japanese card. */
		title?: string | undefined;
		/** Comma-separated energy types, e.g. `"Fire, Water"`: tints the plate when the card has no art and no `card` is given. */
		types?: string | undefined;
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
		plateWidth = undefined,
		priority = false,
		set = undefined,
		sizes = undefined,
		style = undefined,
		title = undefined,
		types = undefined,
		width = undefined
	}: Props = $props();

	let img = $state<HTMLImageElement>();
	let loaded = $state(false);
	let error = $state(false);

	/** A plain <img> without `crossorigin` loads cross-origin images with no CORS headers, so neither host needs a proxy here. */
	const lowResImageUrl = $derived(processCardImage(imageUrl, 'low'));
	const highResImageUrl = $derived(processCardImage(imageUrl, 'high'));

	/** Descriptors must be the real intrinsic widths (245 and 600 for TCGdex, 500 and 868 for CardTrader), otherwise the browser's DPR maths picks the wrong variant. */
	const [lowWidth, highWidth] = $derived(scanWidths(imageUrl));
	const srcsetValue = $derived(
		NO_IMAGES || !imageUrl
			? undefined
			: lowRes
				? `${lowResImageUrl} ${lowWidth}w`
				: `${lowResImageUrl} ${lowWidth}w, ${highResImageUrl} ${highWidth}w`
	);
	const sizesValue = $derived(sizes ?? (width ? `${width}px` : '(max-width: 768px) 50vw, 300px'));
	/**
	 * Card art is 245x337, so a box with no explicit size still reserves the right space, the lazy <img> included: without it the image is 0px tall
	 * until it loads and every tile below jumps. `auto` hands over to the scan's own ratio once it has loaded.
	 */
	const boxStyle = $derived(
		[style, width && `width: ${width}px`, height && `height: ${height}px`, !(width && height) && 'aspect-ratio: auto 245 / 337'].filter(Boolean).join('; ')
	);

	function handleError() {
		error = true;
		onerror?.();
	}

	/**
	 * A recycled tile keeps its <img> element, so a cached src is already complete: the fade is skipped instead of flashing.
	 * A server-rendered <img> can also fail before hydration attaches `onerror`, and only this check catches that.
	 * `img` is read untracked: a failed load swaps it for the plate, and re-running on that swap would reset `error` and loop forever.
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
	<!-- No art, or a URL TCGdex lists before the scan is uploaded (404): the plate stays still instead of pretending to load. -->
	<CardPlate {alt} {card} class="rounded-lg {classNames}" {plateWidth} {set} style={boxStyle} {title} {types} />
{:else}
	<img
		{alt}
		bind:this={img}
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
		style={boxStyle}
		{width}
	/>
{/if}
