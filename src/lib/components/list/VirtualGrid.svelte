<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { updateScrollProgress } from '$helpers/scrollStore';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { FullCard } from '$lib/types';
	import { browser } from '$app/environment';

	export let items: FullCard[];
	export let itemHeight: number;
	export let itemWidth: number;
	export let gapX: number = 0;
	export let gapY: number = 0;
	export let marginTop: number = 0;
	export let forcedItemsPerRow: number | null = null;

	const marginRows = 4;
	const scrollThreshold = itemHeight * 0.8;
	const scrollDuration = 800;

	let container: HTMLDivElement;
	let clientWidth: number = 0;
	let itemsPerRow: number = 1;
	let visibleRows: number = 0;
	let visibleItems: FullCard[] = [];
	let scrollingTo: boolean = false;
	let previousScroll: number = 0;
	let hasScrolled: boolean = false;
	let isInitialized: boolean = false;
	let leftMargin: number = 0;
	let viewportHeight: number = 800;

	$: if (isInitialized && (itemWidth || itemHeight || gapX || gapY || forcedItemsPerRow || clientWidth)) {
		recalculateLayout();
	}

	onMount(() => {
		viewportHeight = window.innerHeight;

		setTimeout(() => {
			if (!container) return;
			clientWidth = container.clientWidth;
			isInitialized = true;
			recalculateLayout();
			updateScrollProgress(container);
		}, 50);
	});

	export function recalculateLayout() {
		if (!isInitialized || !container) return;

		clientWidth = container.clientWidth;

		itemsPerRow = forcedItemsPerRow ?? Math.max(1, Math.floor((clientWidth) / (itemWidth + gapX)));

		visibleRows = Math.ceil(viewportHeight / (itemHeight + gapY));

		const totalGridWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX;
		leftMargin = Math.max(0, (clientWidth - totalGridWidth) / 2);

		updateVisibleItems();
		updateScrollProgress(container);
	}

	function updateVisibleItems() {
		if (scrollingTo || !isInitialized || !container || itemsPerRow <= 0) return;

		const fullRowHeight = itemHeight + gapY;

		const scrollTop = container.scrollTop;
		const startRow = fullRowHeight > 0 ? Math.floor(scrollTop / fullRowHeight) : 0;

		const rowsToRender = visibleRows + marginRows * 2;

		const startIndex = Math.max(0, (startRow - marginRows) * itemsPerRow);
		const endIndex = Math.min(items.length, (startRow + rowsToRender) * itemsPerRow);

		const newVisibleItems = items.slice(startIndex, endIndex);

		if (
			newVisibleItems.length !== visibleItems.length ||
			newVisibleItems[0]?.cardCode !== visibleItems[0]?.cardCode ||
			newVisibleItems[newVisibleItems.length - 1]?.cardCode !== visibleItems[visibleItems.length - 1]?.cardCode
		) {
			visibleItems = newVisibleItems;
		}
	}

	function handleScroll() {
		if (!isInitialized || !container) return;

		const scrollTop = container.scrollTop;
		if (Math.abs(scrollTop - previousScroll) >= scrollThreshold) {
			previousScroll = scrollTop;
			updateVisibleItems();
		}

		hasScrolled = scrollTop > 100;

		updateScrollProgress(container);
	}

	function smoothScroll(element: HTMLElement, targetPosition: number, duration: number) {
		scrollingTo = true;
		const startPosition = element.scrollTop;
		const distance = targetPosition - startPosition;
		const startTime = performance.now();

		function scrollStep(timestamp: number) {
			const currentTime = timestamp - startTime;
			const progress = Math.min(currentTime / duration, 1);
			const easeInOutCubic = (p: number) => p < 0.5 ? 4 * p ** 3 : 1 - Math.pow(-2 * p + 2, 3) / 2;

			element.scrollTop = startPosition + distance * easeInOutCubic(progress);

			if (currentTime < duration) {
				window.requestAnimationFrame(scrollStep);
			} else {
				element.scrollTop = targetPosition;
				scrollingTo = false;
				updateVisibleItems();
				updateScrollProgress(element);
			}
		}

		window.requestAnimationFrame(scrollStep);
	}

	function scrollToLast() {
		if (!container || itemsPerRow <= 0) return;
		const fullRowHeight = itemHeight + gapY;
		const totalHeight = Math.ceil(items.length / itemsPerRow) * fullRowHeight + marginTop;
		const targetScrollTop = totalHeight - container.clientHeight;
		smoothScroll(container, Math.max(0, targetScrollTop), scrollDuration);
	}

	function scrollToTop() {
		if (!container) return;
		smoothScroll(container, 0, scrollDuration);
		setTimeout(() => { hasScrolled = false; }, scrollDuration);
	}

	let resizeTimeout: number;
	function handleResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = window.setTimeout(() => {
			if (isInitialized && container) {
				if (browser) {
					viewportHeight = window.innerHeight;
				}
				recalculateLayout();
			}
		}, 100);
	}

</script>

<svelte:window on:resize={handleResize}/>

<div bind:this={container} class="virtual-grid-container top-2 relative flex-1 w-full overflow-y-scroll scrollbar-hide" on:scroll={handleScroll}>
	{#if isInitialized && itemsPerRow > 0}
		<div class="absolute size-[1px]" style="top: {Math.ceil(items.length / itemsPerRow) * (itemHeight + gapY) + marginTop}px;"></div>

		{#each items as item, i}
			{#if visibleItems.some(visible => visible.cardCode === item.cardCode)}
				{#key item.cardCode}
					<div class="absolute transition-all duration-150 ease-out" style="top: {Math.floor(i / itemsPerRow) * (itemHeight + gapY) + marginTop}px; left: {i % itemsPerRow * (itemWidth + gapX) + leftMargin}px; width: {itemWidth}px; height: {itemHeight}px;">
						<slot {item}/>
					</div>
				{/key}
			{/if}
		{:else}
			<slot name="empty"/>
		{/each}
	{:else if !isInitialized}
		<div class="w-full h-[80vh]"></div>
	{:else if items.length === 0}
        <slot name="empty"/>
	{/if}
</div>

{#if hasScrolled}
<div transition:fade={{ duration: 300 }}>
	<ScrollToTop on:click={scrollToTop}/>
</div>
{/if}
<ScrollToBottom on:click={scrollToLast}/>
