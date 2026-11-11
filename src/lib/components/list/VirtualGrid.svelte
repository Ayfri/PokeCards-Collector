<script lang="ts" generics="T extends { cardCode: string }">
	import type { Snippet } from 'svelte';
	import ScrollButton from '#components/list/ScrollButton.svelte';
	import { gridScroll } from '#stores/grid.svelte.ts';

	interface Props {
		children?: Snippet<[{ index: number; item: T; }]>;
		empty?: Snippet;
		forcedItemsPerRow?: number | null;
		gapX?: number;
		gapY?: number;
		itemHeight: number;
		items: readonly T[];
		itemWidth: number;
		marginTop?: number;
		/** A grid inside a panel turns it off: the progress bar and the fixed scroll buttons belong to a page that scrolls through one grid. */
		pageScroll?: boolean;
	}

	let {
		children,
		empty,
		forcedItemsPerRow = null,
		gapX = 0,
		gapY = 0,
		itemHeight,
		items,
		itemWidth,
		marginTop = 0,
		pageScroll = true
	}: Props = $props();

	/** Rows rendered above and below the viewport so a fast scroll never shows a hole. */
	const marginRows = 4;

	let container = $state<HTMLDivElement>();
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let scrollTop = $state(0);
	let isInitialized = $state(false);

	const rowHeight = $derived(itemHeight + gapY);
	const itemsPerRow = $derived(forcedItemsPerRow ?? Math.max(1, Math.floor(containerWidth / (itemWidth + gapX))));
	const rowCount = $derived(Math.ceil(items.length / itemsPerRow));
	const totalHeight = $derived(rowCount * rowHeight + marginTop);
	const leftMargin = $derived(Math.max(0, (containerWidth - (itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX)) / 2));

	const startRow = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - marginRows));
	const endRow = $derived(startRow + Math.ceil(containerHeight / rowHeight) + marginRows * 2);
	const startIndex = $derived(startRow * itemsPerRow);
	/** Only the on-screen slice is rendered: iterating the full list here would cost ~12 ms per scroll step. */
	const visibleItems = $derived(isInitialized ? items.slice(startIndex, Math.min(items.length, endRow * itemsPerRow)) : []);

	/** Progress comes from the sizes already tracked, so scrolling never reads `scrollHeight` and never forces a reflow. */
	$effect(() => {
		if (!pageScroll) return;
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
			if (container) scrollTop = container.scrollTop;
		});
	}

	function scrollToLast() {
		container?.scrollTo({ behavior: 'smooth', top: Math.max(0, totalHeight - containerHeight) });
	}

	function scrollToTop() {
		container?.scrollTo({ behavior: 'smooth', top: 0 });
	}
</script>

<div {@attach trackSize} bind:this={container} class="relative min-h-0 flex-1 w-full overflow-y-scroll scrollbar-hide" onscroll={handleScroll}>
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
				{@render children?.({ index, item })}
			</div>
		{/each}
	{/if}
</div>

{#if pageScroll}
	<ScrollButton direction="up" onclick={scrollToTop} visible={scrollTop > 100} />
	<ScrollButton direction="down" onclick={scrollToLast} />
{/if}
