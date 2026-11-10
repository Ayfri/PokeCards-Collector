<script lang="ts">
	import { fade } from 'svelte/transition';
	import SearchBar from './SearchBar.svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	let isOpen = $state(false);
	let modalContent = $state<HTMLDivElement>();
	let searchButton = $state<HTMLButtonElement>();

	function toggleModal() {
		isOpen = !isOpen;
	}

	function closeModal() {
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (isOpen && modalContent && searchButton) {
			const targetEl = event.target as Node;
			if (!modalContent.contains(targetEl) && !searchButton.contains(targetEl)) {
				closeModal();
			}
		}
	}
</script>

<svelte:document onclick={handleClickOutside} onkeydown={event => { if (event.key === 'Escape' && isOpen) closeModal(); }} />

<!-- On phones the header has no room for the real input, so this field-shaped button spans the free width and opens the search. -->
<button
	aria-label="Open search"
	bind:this={searchButton}
	class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-700 bg-black px-3 py-1.5 text-left text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-white sm:hidden"
	onclick={event => { event.stopPropagation(); toggleModal(); }}
	title="Search cards and Pokémon"
>
	<Search class="shrink-0" size={16} />
	<span class="truncate">Search cards…</span>
</button>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/90 backdrop-blur-sm z-110 flex-col pt-4"
		transition:fade={{ duration: 200 }}
	>
		<div bind:this={modalContent} class="w-full px-4">
			<div class="flex items-center justify-between mb-4">
				<span class="text-white text-lg font-semibold">Search</span>
				<button aria-label="Close search" class="text-gray-400 hover:text-white p-2" onclick={closeModal} title="Close search (Esc)">
					<X />
				</button>
			</div>
			<div class="w-full">
				<SearchBar
					mobileMode={true}
					onClose={closeModal}
				/>
			</div>
		</div>
	</div>
{/if}
