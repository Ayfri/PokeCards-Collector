<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
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

<!-- On phones the header has no room for the real input, so this field-shaped button spans the free width and opens the search. -->
<button
	class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-700 bg-black px-3 py-1.5 text-left text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-white sm:hidden"
	onclick={event => { event.stopPropagation(); toggleModal(); }}
	aria-label="Open search"
	title="Search cards and Pokémon"
	bind:this={searchButton}
>
	<Search class="shrink-0" size={16} />
	<span class="truncate">Search cards…</span>
</button>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/80 z-110 flex-col pt-4"
		transition:fade={{ duration: 200 }}
	>
		<div class="w-full px-4" bind:this={modalContent}>
			<div class="flex items-center justify-between mb-4">
				<span class="text-white text-lg font-semibold">Search</span>
				<button class="text-gray-400 hover:text-white p-2" onclick={closeModal} aria-label="Close search" title="Close search (Esc)">
					<X />
				</button>
			</div>
			<div class="w-full">
				<SearchBar
					autoFocus={true}
					mobileMode={true}
					onToggleModal={closeModal}
				/>
			</div>
		</div>
	</div>
{/if}
