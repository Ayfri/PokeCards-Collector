<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { updateScrollProgress } from '$helpers/scrollStore.js';
	import {onMount} from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import type {Card} from '~/types.js';

	export let items: Card[];
	export let itemHeight: number;
	export let itemWidth: number;
	export let gapX: number = 0;
	export let gapY: number = 0;
	export let marginTop: number = 0;

	const marginRows = 4;
	const scrollThreshold = itemHeight * 0.8;
	const scrollDuration = 800; // Animation duration in ms

	let container: HTMLDivElement;
	let clientWidth: number;
	let itemsPerRow: number = 1;
	let visibleRows: number = 0;
	let visibleItems: Card[] = [];
	let scrollingTo: boolean = false;
	let previousScroll: number = 0;
	let hasScrolled: boolean = false;
	let isInitialized: boolean = false;

	$: if (container && items && isInitialized) updateVisibleItems();
	$: if ('window' in globalThis) visibleRows = Math.ceil(window.innerHeight / (itemHeight + gapY));
	$: leftMargin = (clientWidth - (itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX)) / 2;

	onMount(() => {
		// Delay the initial render to ensure DOM measurements are accurate
		setTimeout(() => {
			isInitialized = true;
			updateVisibleItems();
			// Initialize scroll progress
			updateScrollProgress(container);
		}, 100);
	});

	function updateVisibleItems() {
		if (scrollingTo || !isInitialized) return;
		itemsPerRow = Math.max(1, Math.floor(clientWidth / (itemWidth + gapX)));
		const scrollTop = container.scrollTop;
		const start = Math.floor(scrollTop / (itemHeight + gapY)) * itemsPerRow;
		const end = start + visibleRows * itemsPerRow;
		visibleItems = items.slice(Math.max(0, start - itemsPerRow * marginRows), end + itemsPerRow * marginRows);
	}

	function scroll() {
		if (!isInitialized) return;
		const scrollTop = container.scrollTop;
		if (Math.abs(scrollTop - previousScroll) < scrollThreshold) {
			return;
		}
		previousScroll = scrollTop;
		updateVisibleItems();
		
		// Set hasScrolled to true when the user has scrolled down
		hasScrolled = scrollTop > 100;
		
		// Update scroll progress
		updateScrollProgress(container);
	}

	// Smooth scroll animation function
	function smoothScroll(element: HTMLElement, targetPosition: number, duration: number) {
		scrollingTo = true;
		const startPosition = element.scrollTop;
		const distance = targetPosition - startPosition;
		const startTime = performance.now();
		
		function scrollStep(timestamp: number) {
			const currentTime = timestamp - startTime;
			const progress = Math.min(currentTime / duration, 1);
			
			// Easing function for smooth animation
			const easeInOutCubic = progress => 
				progress < 0.5
					? 4 * progress ** 3
					: 1 - Math.pow(-2 * progress + 2, 3) / 2;
			
			element.scrollTop = startPosition + distance * easeInOutCubic(progress);
			
			if (currentTime < duration) {
				window.requestAnimationFrame(scrollStep);
			} else {
				element.scrollTop = targetPosition;
				scrollingTo = false;
				updateScrollProgress(element);
			}
		}
		
		window.requestAnimationFrame(scrollStep);
	}

	function scrollToLast() {
		const targetScrollTop = (items.length / itemsPerRow) * (itemHeight + gapY) + marginTop;
		const start = items.length - visibleRows * itemsPerRow;
		const end = start + visibleRows * itemsPerRow;
		visibleItems = items.slice(Math.max(0, start - itemsPerRow * marginRows), end + itemsPerRow * marginRows);
		
		smoothScroll(container, targetScrollTop, scrollDuration);
	}
	
	function scrollToTop() {
		const start = 0;
		const end = visibleRows * itemsPerRow;
		visibleItems = items.slice(start, end + itemsPerRow * marginRows);
		
		smoothScroll(container, 0, scrollDuration);
		// Reset hasScrolled after animation completes
		setTimeout(() => {
			hasScrolled = false;
		}, scrollDuration);
	}
</script>

<svelte:window on:resize={() => {
    setTimeout(() => {
        if (isInitialized) updateVisibleItems();
    }, 0);
}}/>

<div bind:this={container} bind:clientWidth class="relative flex-1 w-full h-full overflow-y-scroll scrollbar-hide" on:scroll={scroll}>
	{#if isInitialized}
		<div class="absolute size-[1px]" style="top: {Math.ceil((items.length) / itemsPerRow) * (itemHeight + gapY) + marginTop}px;"></div>

		{#each items as item, i (item.image)}
			{#if visibleItems.includes(item)}
				{#key item.image}
					<div class="absolute" style="top: {Math.floor(i / itemsPerRow) * (itemHeight + gapY) + marginTop}px; left: {i % itemsPerRow * (itemWidth + gapX) + leftMargin}px">
						<slot {item}/>
					</div>
				{/key}
			{/if}
		{:else}
			<slot name="empty"/>
		{/each}
	{:else}
		<!-- Loading placeholder to maintain height until initialized -->
		<div class="w-full" style="height: {visibleRows * itemHeight}px"></div>
	{/if}
</div>

{#if hasScrolled}
<div transition:fade={{ duration: 300 }}>
	<ScrollToTop on:click={scrollToTop}/>
</div>
{/if}
<ScrollToBottom on:click={scrollToLast}/>
