<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { gridScroll } from '$stores/grid.svelte';
	import { fade } from 'svelte/transition';
	import type { FullCard } from '$lib/types';

	interface Props {
		children?: import('svelte').Snippet<[{ item: FullCard; index: number }]>;
		empty?: import('svelte').Snippet;
		forcedItemsPerRow?: number | null;
		gapX?: number;
		gapY?: number;
		itemHeight: number;
		itemWidth: number;
		items: FullCard[];
		marginTop?: number;
	}

	let {
		children,
		empty,
		forcedItemsPerRow = null,
		gapX = 0,
		gapY = 0,
		itemHeight,
		itemWidth,
		items,
		marginTop = 0
	}: Props = $props();

	/** Rows rendered above and below the viewport so a fast scroll never shows a hole. */
	const marginRows = 4;
	const scrollDuration = 800;

	let container = $state<HTMLDivElement>();
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let scrollTop = $state(0);
	let isInitialized = $state(false);
	let scrollingTo = false;

	const rowHeight = $derived(itemHeight + gapY);
	const itemsPerRow = $derived(forcedItemsPerRow ?? Math.max(1, Math.floor(containerWidth / (itemWidth + gapX))));
	const rowCount = $derived(Math.ceil(items.length / itemsPerRow));
	const totalHeight = $derived(rowCount * rowHeight + marginTop);
	const leftMargin = $derived(Math.max(0, (containerWidth - (itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX)) / 2));

	const startRow = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - marginRows));
	const endRow = $derived(startRow + Math.ceil(containerHeight / rowHeight) + marginRows * 2);
	const startIndex = $derived(startRow * itemsPerRow);
	/** Only the on-screen slice is rendered: iterating the full list here is what used to cost ~12 ms per scroll step. */
	const visibleItems = $derived(isInitialized ? items.slice(startIndex, Math.min(items.length, endRow * itemsPerRow)) : []);

	/** Progress is derived from the sizes we already track, so scrolling never reads scrollHeight and never forces a reflow. */
	$effect(() => {
		const scrollable = totalHeight - containerHeight;
		gridScroll.progress = scrollable > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100)) : 0;
	});

	/**
	 * Also measured synchronously on mount: a ResizeObserver only reports on the next rendering step, which a page transition holds back,
	 * so the tile a card flies back to would not exist yet when the new page is captured.
	 */
	function trackSize(element: HTMLDivElement) {
		const measure = (width: number, height: number) => {
			containerWidth = width;
			containerHeight = height;
			if (width > 0) isInitialized = true;
		};
		measure(element.clientWidth, element.clientHeight);
		const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
		observer.observe(element);
		return () => observer.disconnect();
	}

	let scrollFrame = 0;
	function handleScroll() {
		if (scrollFrame || !container) return;
		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = 0;
			if (container && !scrollingTo) scrollTop = container.scrollTop;
		});
	}

	function smoothScroll(element: HTMLElement, targetPosition: number, duration: number) {
		scrollingTo = true;
		const startPosition = element.scrollTop;
		const distance = targetPosition - startPosition;
		const startTime = performance.now();

		function scrollStep(timestamp: number) {
			const elapsed = timestamp - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;

			element.scrollTop = startPosition + distance * eased;
			scrollTop = element.scrollTop;

			if (progress < 1) {
				requestAnimationFrame(scrollStep);
			} else {
				element.scrollTop = targetPosition;
				scrollTop = targetPosition;
				scrollingTo = false;
			}
		}

		requestAnimationFrame(scrollStep);
	}

	function scrollToLast() {
		if (!container) return;
		smoothScroll(container, Math.max(0, totalHeight - containerHeight), scrollDuration);
	}

	function scrollToTop() {
		if (!container) return;
		smoothScroll(container, 0, scrollDuration);
	}
</script>

<div bind:this={container} {@attach trackSize} class="virtual-grid-container relative min-h-0 flex-1 w-full overflow-y-scroll scrollbar-hide" onscroll={handleScroll}>
	{#if items.length === 0 && isInitialized}
		{@render empty?.()}
	{:else}
		<div class="absolute size-px" style="top: {totalHeight}px;"></div>

		{#each visibleItems as item, offset (item.cardCode)}
			{@const index = startIndex + offset}
			<div
				class="absolute"
				style="top: {Math.floor(index / itemsPerRow) * rowHeight + marginTop}px; left: {(index % itemsPerRow) * (itemWidth + gapX) + leftMargin}px; width: {itemWidth}px; height: {itemHeight}px;"
			>
				{@render children?.({ item, index })}
			</div>
		{/each}
	{/if}
</div>

{#if scrollTop > 100}
	<div transition:fade={{ duration: 300 }}>
		<ScrollToTop onclick={scrollToTop}/>
	</div>
{/if}
<ScrollToBottom onclick={scrollToLast}/>
