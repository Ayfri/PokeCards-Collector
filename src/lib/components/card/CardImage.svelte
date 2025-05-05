<script lang="ts">
	import { processCardImage } from '$lib/helpers/card-images';
	import { NO_IMAGES } from '~/lib/images';

	/**
	 * Alt text for the image
	 * Defaults to "Pokemon card"
	 */
	export let alt: string = 'Pokemon card';

	/**
	 * The image URL from the API
	 * e.g. "https://images.pokemontcg.io/pop5/17_hires.png"
	 */
	export let imageUrl: string;

	/**
	 * Whether to use high-resolution image
	 */
	export let highRes: boolean = true;

	/**
	 * Whether the image is for lazy loading
	 */
	export let lazy: boolean = true;

	/**
	 * Height of the image
	 * Optional if width is specified
	 */
	export let height: number | undefined = undefined;

	/**
	 * Style of the image
	 */
	export let style: string | undefined = undefined;

	/**
	 * Width of the image
	 * Optional if height is specified
	 */
	export let width: number | undefined = undefined;

	/**
	 * CSS classes to apply to the image
	 */
	let classNames: string = '';

	export {classNames as class};

	let loaded = false;
	let error = false;

	// Process the image URL using our centralized function - make reactive to imageUrl changes
	$: standardImageUrl = processCardImage(imageUrl, highRes);
	$: lowResImageUrl = processCardImage(imageUrl, false);
	
	// Check if this is an external URL (not from Pokemon TCG API)
	// If so, route it through the proxy to prevent CORS issues
	$: isExternalUrl = !standardImageUrl.includes('pokemontcg.io');
	
	// For external URLs, we'll use the proxy endpoint
	$: proxyStandardUrl = isExternalUrl ? `/api/image-proxy?url=${encodeURIComponent(standardImageUrl)}` : standardImageUrl;
	$: proxyLowResUrl = isExternalUrl ? `/api/image-proxy?url=${encodeURIComponent(lowResImageUrl)}` : lowResImageUrl;

	// Prepare srcset based on actual dimensions
	$: srcsetValue = width ? 
		`${proxyLowResUrl} ${Math.floor(width*0.82)}w, ${proxyStandardUrl} ${width}w` :
		`${proxyLowResUrl} 245w, ${proxyStandardUrl} 300w`;

	$: sizesValue = width ? 
		`(max-width: ${Math.floor(width*0.82)}px) ${Math.floor(width*0.82)}px, ${width}w` :
		'(max-width: 245px) 245px, 300w';

	// Handle error case
	function handleError() {
		error = true;
	}

	function onLoad() {
		loaded = true;
		error = false; // Reset error state when image loads successfully
	}
	
	// Reset the loaded state when imageUrl changes
	$: if (imageUrl) {
		loaded = false;
		error = false;
	}
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
		on:error={handleError}
		on:load={onLoad}
		sizes={sizesValue}
		src={proxyStandardUrl}
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
