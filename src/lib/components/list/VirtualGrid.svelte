<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { updateScrollProgress } from '$helpers/scrollStore';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { FullCard } from '$lib/types';
	import { browser } from '$app/environment';

	interface Props {
		items: FullCard[];
		itemHeight: number;
		itemWidth: number;
		gapX?: number;
		gapY?: number;
		marginTop?: number;
		forcedItemsPerRow?: number | null;
		children?: import('svelte').Snippet<[any]>;
		empty?: import('svelte').Snippet;
	}

	let {
		items,
		itemHeight,
		itemWidth,
		gapX = 0,
		gapY = 0,
		marginTop = 0,
		forcedItemsPerRow = null,
		children,
		empty
	}: Props = $props();

	const marginRows = 4;
	const scrollThreshold = $derived(itemHeight * 0.8);
	const scrollDuration = 800;

	let container = $state<HTMLDivElement>();
	let clientWidth: number = $state(0);
	let itemsPerRow: number = $state(1);
	let visibleRows: number = 0;
	let visibleItems: FullCard[] = $state([]);
	let scrollingTo: boolean = false;
	let previousScroll: number = 0;
	let hasScrolled: boolean = $state(false);
	let isInitialized: boolean = $state(false);
	let leftMargin: number = $state(0);
	let viewportHeight: number = 800;


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

	$effect(() => {
		if (isInitialized && (itemWidth || itemHeight || gapX || gapY || forcedItemsPerRow || clientWidth)) {
			recalculateLayout();
		}
	});
</script>

<svelte:window onresize={handleResize}/>

<div bind:this={container} class="virtual-grid-container top-2 relative flex-1 w-full overflow-y-scroll scrollbar-hide" onscroll={handleScroll}>
	{#if isInitialized && itemsPerRow > 0}
		<div class="absolute size-px" style="top: {Math.ceil(items.length / itemsPerRow) * (itemHeight + gapY) + marginTop}px;"></div>

		{#each items as item, i}
			{#if visibleItems.some(visible => visible.cardCode === item.cardCode)}
				{#key item.cardCode}
					<div class="absolute transition-all duration-150 ease-out" style="top: {Math.floor(i / itemsPerRow) * (itemHeight + gapY) + marginTop}px; left: {i % itemsPerRow * (itemWidth + gapX) + leftMargin}px; width: {itemWidth}px; height: {itemHeight}px;">
						{@render children?.({ item, })}
					</div>
				{/key}
			{/if}
		{:else}
			{@render empty?.()}
		{/each}
	{:else if !isInitialized}
		<div class="w-full h-[80vh]"></div>
	{:else if items.length === 0}
        {@render empty?.()}
	{/if}
</div>

{#if hasScrolled}
<div transition:fade={{ duration: 300 }}>
	<ScrollToTop onclick={scrollToTop}/>
</div>
{/if}
<ScrollToBottom onclick={scrollToLast}/>
