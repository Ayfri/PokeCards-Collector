<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { updateScrollProgress } from '$helpers/scrollStore';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { FullCard } from '$lib/types';
	import { browser } from '$app/environment'; // Import browser check
	import { filterStates } from '$stores/filterStates';

	export let items: FullCard[];
	export let itemHeight: number;
	export let itemWidth: number;
	export let gapX: number = 0;
	export let gapY: number = 0;
	export let marginTop: number = 0;
	export let forcedItemsPerRow: number | null = null; // Use this value if provided

	const marginRows = 4; // Number of extra rows to render above/below viewport
	const scrollThreshold = itemHeight * 0.8; // Minimum scroll distance to trigger update
	const scrollDuration = 800; // Animation duration in ms

	let container: HTMLDivElement;
	let clientWidth: number = 0; // Container width
	let itemsPerRow: number = 1; // Calculated items per row
	let visibleRows: number = 0; // Calculated visible rows based on viewport height
	let visibleItems: FullCard[] = []; // Items currently rendered
	let scrollingTo: boolean = false; // Flag during smooth scroll animation
	let previousScroll: number = 0; // Last scroll position to compare against threshold
	let hasScrolled: boolean = false; // Flag if user has scrolled down significantly
	let isInitialized: boolean = false; // Flag to prevent calculations before mount
	let leftMargin: number = 0; // Margin to center the grid items
	let viewportHeight: number = 800; // Default height, updated on mount

	// Reactive statement: Recalculate layout when props or container width change after init
	$: if (isInitialized && (itemWidth || itemHeight || gapX || gapY || forcedItemsPerRow || clientWidth)) {
		recalculateLayout();
	}

	onMount(() => {
		// This runs only on the client
		viewportHeight = window.innerHeight; // Get actual viewport height

		// Delay the initial calculation slightly to ensure accurate DOM measurements
		setTimeout(() => {
			if (!container) return;
			clientWidth = container.clientWidth; // Get initial width
			isInitialized = true;
			recalculateLayout(); // Perform initial layout calculation
			updateScrollProgress(container); // Initialize scroll progress
		}, 50); // Short delay
	});

	// Recalculates grid layout parameters and updates visible items
	export function recalculateLayout() {
		if (!isInitialized || !container) return;

		// Ensure clientWidth is current (important after resize)
		clientWidth = container.clientWidth;

		// Determine items per row: use forced value or calculate based on width
		itemsPerRow = forcedItemsPerRow ?? Math.max(1, Math.floor((clientWidth) / (itemWidth + gapX)));

		// Calculate how many rows fit in the current viewport height (use stored viewportHeight)
		visibleRows = Math.ceil(viewportHeight / (itemHeight + gapY));

		// Calculate left margin needed to center the grid content
		const totalGridWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX;
		leftMargin = Math.max(0, (clientWidth - totalGridWidth) / 2);

		// Update the list of items to be rendered based on the new layout
		updateVisibleItems();

		// Update the scroll progress bar based on the new layout
		updateScrollProgress(container);
	}

	// Determines which items should be visible based on scroll position
	function updateVisibleItems() {
		if (scrollingTo || !isInitialized || !container || itemsPerRow <= 0) return;

		// Calculate the effective height of each row
		const fullRowHeight = itemHeight + gapY;

		const scrollTop = container.scrollTop;
		// Determine the first row index currently in view
		const startRow = fullRowHeight > 0 ? Math.floor(scrollTop / fullRowHeight) : 0;

		// Calculate the total number of rows to render (visible + margin rows)
		const rowsToRender = visibleRows + marginRows * 2;

		// Calculate the start and end indices for the items slice
		const startIndex = Math.max(0, (startRow - marginRows) * itemsPerRow);
		const endIndex = Math.min(items.length, (startRow + rowsToRender) * itemsPerRow);

		const newVisibleItems = items.slice(startIndex, endIndex);

		// Optimization: Only update the visibleItems array if the actual items have changed
		if (
			newVisibleItems.length !== visibleItems.length ||
			newVisibleItems[0]?.cardCode !== visibleItems[0]?.cardCode ||
			newVisibleItems[newVisibleItems.length - 1]?.cardCode !== visibleItems[visibleItems.length - 1]?.cardCode
		) {
			visibleItems = newVisibleItems;
		}
	}

	// Handles the scroll event on the container
	function handleScroll() {
		if (!isInitialized || !container) return;

		const scrollTop = container.scrollTop;
		// Only update visible items if scroll distance exceeds the threshold
		if (Math.abs(scrollTop - previousScroll) >= scrollThreshold) {
			previousScroll = scrollTop;
			updateVisibleItems();
		}

		// Show scroll-to-top button if scrolled down sufficiently
		hasScrolled = scrollTop > 100;

		// Update the visual scroll progress indicator
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
			const easeInOutCubic = (p: number) => p < 0.5 ? 4 * p ** 3 : 1 - Math.pow(-2 * p + 2, 3) / 2;

			element.scrollTop = startPosition + distance * easeInOutCubic(progress);

			if (currentTime < duration) {
				window.requestAnimationFrame(scrollStep);
			} else {
				element.scrollTop = targetPosition;
				scrollingTo = false;
				updateVisibleItems(); // Ensure items are updated after scroll
				updateScrollProgress(element); // Update progress bar after scroll
			}
		}

		window.requestAnimationFrame(scrollStep);
	}

	// Scrolls to the bottom of the grid
	function scrollToLast() {
		if (!container || itemsPerRow <= 0) return;
		const fullRowHeight = itemHeight + gapY;
		const totalHeight = Math.ceil(items.length / itemsPerRow) * fullRowHeight + marginTop;
		const targetScrollTop = totalHeight - container.clientHeight;
		smoothScroll(container, Math.max(0, targetScrollTop), scrollDuration);
	}

	// Scrolls to the top of the grid
	function scrollToTop() {
		if (!container) return;
		smoothScroll(container, 0, scrollDuration);
		// Reset hasScrolled flag after animation
		setTimeout(() => { hasScrolled = false; }, scrollDuration);
	}

	// Debounced resize handler
	let resizeTimeout: number;
	function handleResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = window.setTimeout(() => {
			if (isInitialized && container) {
				if (browser) { // Guard window access
					viewportHeight = window.innerHeight;
				}
				recalculateLayout();
			}
		}, 100); // Debounce resize events
	}

</script>

<svelte:window on:resize={handleResize}/>

<div bind:this={container} class="virtual-grid-container top-2 relative flex-1 w-full overflow-y-scroll scrollbar-hide" on:scroll={handleScroll}>
	{#if isInitialized && itemsPerRow > 0}
		<!-- Spacer div to set the total scrollable height -->
		<div class="absolute size-[1px]" style="top: {Math.ceil(items.length / itemsPerRow) * (itemHeight + gapY) + marginTop}px;"></div>

		{#each items as item, i} <!-- Use cardCode for more reliable key -->
			{#if visibleItems.some(visible => visible.cardCode === item.cardCode)} <!-- More robust check -->
				{#key item.cardCode}
					<!-- Position each visible item absolutely -->
					<div class="absolute transition-all duration-150 ease-out" style="top: {Math.floor(i / itemsPerRow) * (itemHeight + gapY) + marginTop}px; left: {i % itemsPerRow * (itemWidth + gapX) + leftMargin}px; width: {itemWidth}px; height: {itemHeight}px;">
						<slot {item}/>
					</div>
				{/key}
			{/if}
		{:else}
			<slot name="empty"/>
		{/each}
	{:else if !isInitialized}
		<!-- Loading placeholder - Use CSS or a fixed height, avoids window access during SSR -->
		<div class="w-full h-[80vh]"></div> <!-- Example: Use viewport height unit or a fixed pixel value -->
	{:else if items.length === 0}
	    <!-- Explicit empty slot rendering when initialized but no items -->
        <slot name="empty"/>
	{/if}
</div>

{#if hasScrolled}
<div transition:fade={{ duration: 300 }}>
	<ScrollToTop on:click={scrollToTop}/>
</div>
{/if}
<ScrollToBottom on:click={scrollToLast}/>
