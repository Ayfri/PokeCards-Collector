<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import SearchBar from './SearchBar.svelte';
	import type { FullCard } from '~/types.js';
	import { Search, X } from 'lucide-svelte';

	export let allCards: FullCards[] = [];

	let isOpen = false;

	function toggleModal() {
		isOpen = !isOpen;
	}

	// Handle escape key
	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && isOpen) {
				toggleModal();
			}
		};

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<!-- Mobile search icon (only on xs screens) -->
<button
	class="text-gray-400 hover:text-white rounded-full sm:hidden"
	on:click={toggleModal}
	aria-label="Open search"
>
	<Search />
</button>

<!-- Mobile search modal/overlay -->
{#if isOpen}
	<div
		class="fixed inset-0 bg-black/80 z-[110] flex-col pt-4"
		transition:fade={{ duration: 200 }}
	>
		<div class="w-full px-4">
			<div class="flex items-center justify-between mb-4">
				<span class="text-white text-lg font-semibold">Search Cards</span>
				<button class="text-gray-400 hover:text-white p-2" on:click={toggleModal}>
					<X />
				</button>
			</div>
			<div class="w-full">
				<SearchBar
					{allCards}
					autoFocus={true}
					mobileMode={true}
					onToggleModal={toggleModal}
				/>
			</div>
		</div>
	</div>
{/if}
