<script lang="ts">
	import ScrollToBottom from '@components/list/ScrollToBottom.svelte';
	import ScrollToTop from '@components/list/ScrollToTop.svelte';
	import { updateScrollProgress } from '$helpers/scrollStore';
	import {onMount} from 'svelte';
	import { fade } from 'svelte/transition';
	import type {FullCard} from '~/lib/types';

	export let items: FullCard[];
	export let itemHeight: number;
	export let itemWidth: number;
	export let gapX: number = 0;
	export let gapY: number = 0;
	export let marginTop: number = 0;
	export let forcedItemsPerRow: number | null = null; // Nombre forcé d'éléments par ligne

	const marginRows = 4;
	const scrollThreshold = itemHeight * 0.8;
	const scrollDuration = 800; // Animation duration in ms

	let container: HTMLDivElement;
	let clientWidth: number;
	let itemsPerRow: number = 1;
	let visibleRows: number = 0;
	let visibleItems: FullCard[] = [];
	let scrollingTo: boolean = false;
	let previousScroll: number = 0;
	let hasScrolled: boolean = false;
	let isInitialized: boolean = false;
	let leftMargin: number = 0;

	$: if (container && items && isInitialized) updateVisibleItems();
	$: if ('window' in globalThis) visibleRows = Math.ceil(window.innerHeight / (itemHeight + gapY));
	$: leftMargin = Math.max(0, (clientWidth - (itemsPerRow * itemWidth + (itemsPerRow - 1) * gapX)) / 2);

	onMount(() => {
		// Delay the initial render to ensure DOM measurements are accurate
		setTimeout(() => {
			isInitialized = true;
			updateVisibleItems();
			// Initialize scroll progress
			updateScrollProgress(container);
		}, 100);

		// Écouter l'événement de changement de taille de grille
		const handleGridSizeChange = () => {
			reinitializeGrid();
		};
		
		// Ajouter l'écouteur d'événement
		window.addEventListener('grid-size-changed', handleGridSizeChange);
		
		// Supprimer l'écouteur d'événement lors du démontage
		return () => {
			window.removeEventListener('grid-size-changed', handleGridSizeChange);
		};
	});

	function updateVisibleItems() {
		if (scrollingTo || !isInitialized) return;
		
		// Calculer combien d'éléments peuvent tenir dans une ligne
		// en tenant compte de la largeur des cartes et de leur espacement
		if (forcedItemsPerRow) {
			itemsPerRow = forcedItemsPerRow;
		} else {
			itemsPerRow = Math.max(1, Math.floor((clientWidth - gapX) / (itemWidth + gapX)));
		}
		
		// Calculer la hauteur totale d'une carte avec son espacement et ses informations
		const fullCardHeight = itemHeight + gapY + Math.floor(itemHeight * 0.25);
		
		// Optimisation avec des grandes listes: limiter le nombre maximum d'éléments traités
		// Pour éviter de ralentir le navigateur, on limite à un certain nombre de lignes visibles
		const scrollTop = container.scrollTop;
		const startRow = Math.floor(scrollTop / fullCardHeight);
		// On ajoute une marge de rows pour avoir du contenu au-dessus et en-dessous de la vue
		const visibleRowCount = Math.ceil(window.innerHeight / fullCardHeight) + marginRows * 2;
		
		// Calculer les indices du premier et dernier élément à afficher
		const startIndex = Math.max(0, startRow * itemsPerRow);
		const endIndex = Math.min(items.length, (startRow + visibleRowCount) * itemsPerRow);
		
		// Ne mettre à jour les éléments visibles que si nécessaire
		const newVisibleItems = items.slice(startIndex, endIndex);
		
		// Comparaison rapide pour éviter des re-rendus inutiles
		if (
			newVisibleItems.length !== visibleItems.length ||
			newVisibleItems[0]?.cardCode !== visibleItems[0]?.cardCode ||
			newVisibleItems[newVisibleItems.length - 1]?.cardCode !== visibleItems[visibleItems.length - 1]?.cardCode
		) {
			visibleItems = newVisibleItems;
		}
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
			const easeInOutCubic = (progress: number) =>
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
		// Calculer la hauteur totale d'une carte avec son espacement et ses informations
		const fullCardHeight = itemHeight + gapY + Math.floor(itemHeight * 0.25);
		const targetScrollTop = (items.length / itemsPerRow) * fullCardHeight + marginTop;
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

	// Méthode publique pour forcer une réinitialisation complète de la grille
	export function reinitializeGrid() {
		// On n'a pas besoin de réinitialiser isInitialized complètement
		// car cela force un re-rendu coûteux de tous les éléments
		
		// Recalculer uniquement les variables critiques
		if (forcedItemsPerRow) {
			itemsPerRow = forcedItemsPerRow;
		} else {
			itemsPerRow = Math.max(1, Math.floor((clientWidth - gapX) / (itemWidth + gapX)));
		}
		
		// Recalculer les éléments visibles et leurs positions
		updateVisibleItems();
		
		// Mettre à jour la progress bar si nécessaire
		if (container) {
			updateScrollProgress(container);
		}
	}
</script>

<svelte:window on:resize={() => {
    setTimeout(() => {
        if (isInitialized) updateVisibleItems();
    }, 0);
}}/>

<div bind:this={container} bind:clientWidth class="virtual-grid-container top-2 relative flex-1 w-full overflow-y-scroll scrollbar-hide" on:scroll={scroll}>
	{#if isInitialized}
		<div class="absolute size-[1px]" style="top: {Math.ceil((items.length) / itemsPerRow) * (itemHeight + gapY + Math.floor(itemHeight * 0.25)) + marginTop}px;"></div>

		{#each items as item, i (item.image)}
			{#if visibleItems.includes(item)}
				{#key item.image}
					<div class="absolute" style="top: {Math.floor(i / itemsPerRow) * (itemHeight + gapY + Math.floor(itemHeight * 0.25)) + marginTop}px; left: {i % itemsPerRow * (itemWidth + gapX) + leftMargin}px">
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
