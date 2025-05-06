<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import SearchBar from './SearchBar.svelte';
	import type { FullCard, Set, PriceData } from '~/lib/types';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';

	export let allCards: FullCard[] = [];
	export let prices: Record<string, PriceData> = {};
	export let sets: Set[] = [];
	let isOpen = false;
	let modalContent: HTMLDivElement;
	let searchButton: HTMLButtonElement;

	function toggleModal() {
		isOpen = !isOpen;
	}

	function closeModal() {
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (isOpen && modalContent && searchButton) {
			const targetEl = event.target as Node;
			// Check if click was outside the modal content and not on the search button
			if (!modalContent.contains(targetEl) && !searchButton.contains(targetEl)) {
				closeModal();
			}
		}
	}

	// Handle escape key and click outside
	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && isOpen) {
				closeModal();
			}
		};

		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<!-- Mobile search icon (only on xs screens) -->
<button
	class="text-gray-400 hover:text-white rounded-full sm:hidden"
	on:click|stopPropagation={toggleModal}
	aria-label="Open search"
	bind:this={searchButton}
>
	<Search />
</button>

<!-- Mobile search modal/overlay -->
{#if isOpen}
	<div
		class="fixed inset-0 bg-black/80 z-[110] flex-col pt-4"
		transition:fade={{ duration: 200 }}
	>
		<div class="w-full px-4" bind:this={modalContent} on:click|stopPropagation={() => {}}>
			<div class="flex items-center justify-between mb-4">
				<span class="text-white text-lg font-semibold">Search Cards</span>
				<button class="text-gray-400 hover:text-white p-2" on:click={closeModal}>
					<X />
				</button>
			</div>
			<div class="w-full">
				<SearchBar
					{allCards}
					{prices}
					{sets}
					autoFocus={true}
					mobileMode={true}
					onToggleModal={closeModal}
				/>
			</div>
		</div>
	</div>
{/if}
