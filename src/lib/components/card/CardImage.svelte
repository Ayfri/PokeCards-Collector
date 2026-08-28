<script lang="ts">
	import { processCardImage } from '$lib/helpers/card-images';
	import { NO_IMAGES } from '~/lib/images';

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
		/** Whether to request the low-quality image instead of the high-quality one. */
		lowRes?: boolean;
		/** Called when the image fails to load. */
		onerror?: (event: Event) => void;
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
		style = undefined,
		width = undefined
	}: Props = $props();

	let loaded = $state(false);
	let error = $state(false);

	// Default fallback image for missing images
	const DEFAULT_FALLBACK_IMAGE = '/default-card-image.png';

	// assets.tcgdex.net answers with `Access-Control-Allow-Origin: *`, so no proxy is needed.
	const standardImageUrl = $derived(imageUrl ? processCardImage(imageUrl, lowRes ? 'low' : 'high') : DEFAULT_FALLBACK_IMAGE);
	const lowResImageUrl = $derived(imageUrl ? processCardImage(imageUrl, 'low') : DEFAULT_FALLBACK_IMAGE);

	// Prepare srcset based on actual dimensions
	const srcsetValue = $derived(width ?
		`${lowResImageUrl} ${Math.floor(width*0.82)}w, ${standardImageUrl} ${width}w` :
		`${lowResImageUrl} 245w, ${standardImageUrl} 300w`);

	const sizesValue = $derived(width ? 
		`(max-width: ${Math.floor(width*0.82)}px) ${Math.floor(width*0.82)}px, ${width}w` :
		'(max-width: 245px) 245px, 300w');

	// Handle error case
	function handleError(event: Event) {
		error = true;
		console.warn(`Image failed to load: ${imageUrl || 'undefined'}`);
		onerror?.(event);
	}

	function onLoad() {
		loaded = true;
		error = false; // Reset error state when image loads successfully
	}
	
	// Reset the loaded state when imageUrl changes
	$effect.pre(() => {
		if (imageUrl) {
			loaded = false;
			error = false;
		}
	});
</script>
{#if error}
	<div class="flex items-center justify-center bg-red-900 text-white rounded-lg {classNames}" style="{style || ''} {width ? `width: ${width}px;` : ''} {height ? `height: ${height}px;` : ''}">
		<span>Image not available</span>
	</div>
{:else}
	<img
		{alt}
		class="transition-opacity duration-300 ease-in-out {classNames} {loaded ? '' : 'opacity-0'} {NO_IMAGES ? 'border border-gold-400/50' : ''}"
		decoding="async"
		draggable="false"
		{height}
		loading={lazy ? 'lazy' : 'eager'}
		onerror={handleError}
		onload={onLoad}
		sizes={sizesValue}
		src={standardImageUrl}
		srcset={srcsetValue}
		style={style}
		{width}
	/>
{/if}

<style>
	.holo::after {
		background-image: url("https://assets.codepen.io/13471/sparkles.gif"), url(https://assets.codepen.io/13471/holo.png), linear-gradient(125deg, #ff008450 15%, #fca40040 30%, #ffff0030 40%, #00ff8a20 60%, #00cfff40 70%, #cc4cfa50 85%);
		background-position: 50% 50%;
		background-size: 160%;
		filter: brightness(1) contrast(1);
		mix-blend-mode: color-dodge;
		opacity: 70%;
		transition: all 0.33s ease;
		z-index: 2;
	}

	.holo::before,
	.holo::after {
		background-repeat: no-repeat;
		content: "";
		height: var(--card-height, 420px);
		width: var(--card-width, 300px);
		left: 50%;
		mix-blend-mode: color-dodge;
		position: absolute;
		top: 43%;
		transform: translate(-50%, -50%);
		transition: all 0.33s ease;
	}

	@-webkit-keyframes holoSparkle {
		0%, 100% {
			opacity: 0.75;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(1.25);
		}
		5%, 8% {
			opacity: 1;
			background-position: 40% 40%;
			filter: brightness(0.8) contrast(1.2);
		}
		13%, 16% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(0.8);
		}
		35%, 38% {
			opacity: 1;
			background-position: 60% 60%;
			filter: brightness(1) contrast(1);
		}
		55% {
			opacity: 0.33;
			background-position: 45% 45%;
			filter: brightness(1.2) contrast(1.25);
		}
	}

	@keyframes holoSparkle {
		0%, 100% {
			opacity: 0.75;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(1.25);
		}
		5%, 8% {
			opacity: 1;
			background-position: 40% 40%;
			filter: brightness(0.8) contrast(1.2);
		}
		13%, 16% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(0.8);
		}
		35%, 38% {
			opacity: 1;
			background-position: 60% 60%;
			filter: brightness(1) contrast(1);
		}
		55% {
			opacity: 0.33;
			background-position: 45% 45%;
			filter: brightness(1.2) contrast(1.25);
		}
	}

	@-webkit-keyframes holoGradient {
		0%, 100% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(0.5) contrast(1);
		}
		5%, 9% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
		13%, 17% {
			background-position: 0 0;
			opacity: 0.88;
		}
		35%, 39% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.5) contrast(1);
		}
		55% {
			background-position: 0 0;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
	}

	@keyframes holoGradient {
		0%, 100% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(0.5) contrast(1);
		}
		5%, 9% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
		13%, 17% {
			background-position: 0 0;
			opacity: 0.88;
		}
		35%, 39% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.5) contrast(1);
		}
		55% {
			background-position: 0 0;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
	}

	@-webkit-keyframes holoCard {
		0%, 100% {
			transform: rotateZ(0deg) rotateX(0deg) rotateY(0deg);
		}
		5%, 8% {
			transform: rotateZ(0deg) rotateX(6deg) rotateY(-20deg);
		}
		13%, 16% {
			transform: rotateZ(0deg) rotateX(-9deg) rotateY(32deg);
		}
		35%, 38% {
			transform: rotateZ(3deg) rotateX(12deg) rotateY(20deg);
		}
		55% {
			transform: rotateZ(-3deg) rotateX(-12deg) rotateY(-27deg);
		}
	}

	@keyframes holoCard {
		0%, 100% {
			transform: rotateZ(0deg) rotateX(0deg) rotateY(0deg);
		}
		5%, 8% {
			transform: rotateZ(0deg) rotateX(6deg) rotateY(-20deg);
		}
		13%, 16% {
			transform: rotateZ(0deg) rotateX(-9deg) rotateY(32deg);
		}
		35%, 38% {
			transform: rotateZ(3deg) rotateX(12deg) rotateY(20deg);
		}
		55% {
			transform: rotateZ(-3deg) rotateX(-12deg) rotateY(-27deg);
		}
	}

	@-webkit-keyframes rubberBand {
		from {
			transform: scale3d(1, 1, 1);
		}
		30% {
			transform: scale3d(1.25, 0.75, 1);
		}
		40% {
			transform: scale3d(0.75, 1.25, 1);
		}
		50% {
			transform: scale3d(1.15, 0.85, 1);
		}
		65% {
			transform: scale3d(0.95, 1.05, 1);
		}
		75% {
			transform: scale3d(1.05, 0.95, 1);
		}
		to {
			transform: scale3d(1, 1, 1);
		}
	}

	@keyframes rubberBand {
		from {
			transform: scale3d(1, 1, 1);
		}
		30% {
			transform: scale3d(1.25, 0.75, 1);
		}
		40% {
			transform: scale3d(0.75, 1.25, 1);
		}
		50% {
			transform: scale3d(1.15, 0.85, 1);
		}
		65% {
			transform: scale3d(0.95, 1.05, 1);
		}
		75% {
			transform: scale3d(1.05, 0.95, 1);
		}
		to {
			transform: scale3d(1, 1, 1);
		}
	}

	@keyframes placeHolderShimmer {
		0% {
			background-position: -468px 0
		}
		100% {
			background-position: 468px 0
		}
	}
</style>
