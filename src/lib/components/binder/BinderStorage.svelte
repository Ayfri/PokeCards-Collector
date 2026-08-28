<script lang="ts">
	import { type Writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import Button from '@components/filters/Button.svelte';
	import CardImage from '@components/card/CardImage.svelte';
	import Select from '@components/filters/Select.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import CheckIcon from '@lucide/svelte/icons/check';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import X from '@lucide/svelte/icons/x';
	import { isCardCode, parseCardCode } from '$helpers/card-utils';
	import type { FullCard, PriceData, Set } from '$lib/types';

	interface Props {
		allCards: FullCard[];
		cards: Writable<string[]>;
		onAutoFill: () => void;
		onSelect: (item: string | null) => void;
		/** Dropping a binder card back here pulls it out of its slot. */
		onDropFromBinder: (event: DragEvent) => void;
		/** Codes and URLs already sitting in a binder slot, so the tile can flag them. */
		placedItems: globalThis.Set<string>;
		/** Cardmarket values in EUR, keyed by card code. */
		prices: Record<string, PriceData>;
		/** Item armed for click-to-place, `null` when none. */
		selected: string | null;
		sets: Set[];
		toggleClearStorageModal: () => void;
		/** The list as displayed, so auto-fill pours cards in the order the user sorted them. */
		visibleItems?: string[];
	}

	let {
		allCards,
		cards,
		onAutoFill,
		onDropFromBinder,
		onSelect,
		placedItems,
		prices,
		selected,
		sets,
		toggleClearStorageModal,
		visibleItems = $bindable([])
	}: Props = $props();

	const cardDataMap = $derived(new Map(allCards.map(card => [card.cardCode, card])));

	let searchTerm = $state('');
	let sortBy = $state('type');
	let sortOrder = $state('asc');
	let hidePlaced = $state(false);

	onMount(() => {
		const savedSortBy = localStorage.getItem('binderStorageSortBy');
		const savedSortOrder = localStorage.getItem('binderStorageSortOrder');
		if (savedSortBy) sortBy = savedSortBy;
		if (savedSortOrder) sortOrder = savedSortOrder;
		hidePlaced = localStorage.getItem('binderStorageHidePlaced') === 'true';
	});

	const filteredCardCodes = $derived.by(() => {
		let filtered = [...$cards];

		if (hidePlaced) filtered = filtered.filter(item => !placedItems.has(item));

		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(item => {
				if (isCardCode(item)) {
					const fullCard = cardDataMap.get(item);
					return item.toLowerCase().includes(term) ||
						fullCard?.name.toLowerCase().includes(term) ||
						fullCard?.setName.toLowerCase().includes(term);
				}
				return item.toLowerCase().includes(term);
			});
		}

		filtered.sort((itemA, itemB) => {
			const isCodeA = isCardCode(itemA);
			const isCodeB = isCardCode(itemB);

			// Group card codes before URLs
			if (isCodeA && !isCodeB) return -1;
			if (!isCodeA && isCodeB) return 1;

			let comparison = 0;
			if (isCodeA && isCodeB) {
				const {cardNumber: cardNumberA = '0', pokemonNumber: pokemonNumberA = 0, setCode: setCodeA = ''} = parseCardCode(itemA);
				const {cardNumber: cardNumberB = '0', pokemonNumber: pokemonNumberB = 0, setCode: setCodeB = ''} = parseCardCode(itemB);
				if (sortBy === 'number') {
					comparison = parseInt(cardNumberA) - parseInt(cardNumberB);
					if (comparison === 0) comparison = pokemonNumberA - pokemonNumberB;
				} else if (sortBy === 'set') {
					comparison = setCodeA.localeCompare(setCodeB);
					if (comparison === 0) comparison = parseInt(cardNumberA) - parseInt(cardNumberB);
				} else if (sortBy === 'name') {
					comparison = (cardDataMap.get(itemA)?.name ?? '').localeCompare(cardDataMap.get(itemB)?.name ?? '');
				} else if (sortBy === 'price') {
					comparison = (prices[itemA]?.simple ?? 0) - (prices[itemB]?.simple ?? 0);
				}
			} else if (!isCodeA && !isCodeB) {
				comparison = itemA.localeCompare(itemB);
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});

		return filtered;
	});

	$effect(() => { visibleItems = filteredCardCodes; });

	const placedCount = $derived($cards.filter(item => placedItems.has(item)).length);

	function onDragStart(e: DragEvent, item: string) {
		if (!e.dataTransfer) return;

		if (isCardCode(item)) {
			const fullCard = cardDataMap.get(item);
			if (!fullCard) {
				console.error(`Cannot start drag, card details not found for code: ${item}`);
				e.preventDefault();
				return;
			}
			e.dataTransfer.setData('text/plain', crypto.randomUUID()); // For Firefox compatibility
			e.dataTransfer.setData('cardCode', item);
			e.dataTransfer.setData('cardUrl', fullCard.image);
			e.dataTransfer.setData('source-type', 'storage');
		} else {
			e.dataTransfer.setData('text/plain', crypto.randomUUID());
			e.dataTransfer.setData('cardUrl', item);
			e.dataTransfer.setData('source-type', 'storage-url');
		}
		e.dataTransfer.effectAllowed = 'copy';
	}

	function removeItem(itemToRemove: string) {
		if (selected === itemToRemove) onSelect(null);
		$cards = $cards.filter(item => item !== itemToRemove);
	}

	function toggleSelect(item: string) {
		onSelect(selected === item ? null : item);
	}

	const SORT_OPTIONS = [
		{ label: 'Added order', value: 'type' },
		{ label: 'Card number', value: 'number' },
		{ label: 'Set', value: 'set' },
		{ label: 'Name', value: 'name' },
		{ label: 'Price', value: 'price' }
	];

	$effect(() => { localStorage.setItem('binderStorageSortBy', sortBy); });

	function toggleSortOrder() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		localStorage.setItem('binderStorageSortOrder', sortOrder);
	}

	let dropActive = $state(false);

	function handleDragOver(event: DragEvent) {
		if (!event.dataTransfer?.types.includes('source-type')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		dropActive = true;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dropActive = false;
		onDropFromBinder(event);
	}

	function toggleHidePlaced() {
		hidePlaced = !hidePlaced;
		localStorage.setItem('binderStorageHidePlaced', hidePlaced.toString());
	}
</script>

<div
	class="flex h-full flex-col rounded-2xl bg-gray-800 p-4 transition-colors {dropActive ? 'ring-2 ring-gold-400' : ''}"
	ondragover={handleDragOver}
	ondragleave={() => (dropActive = false)}
	ondrop={handleDrop}
	role="region"
	aria-label="Card storage"
>
	<div class="mb-1 flex items-center justify-between">
		<h3 class="text-lg text-gold-400">Storage ({$cards.length})</h3>
		{#if $cards.length > 0}
			<div class="flex items-center gap-1">
				<Button class="border-gold-400 px-2 text-xs text-gold-400" onClick={onAutoFill} title="Pour the storage into the empty slots, in the order it is sorted">
					<WandSparklesIcon size={14} /> Auto-fill
				</Button>
				<Button class="p-1" onClick={toggleClearStorageModal} title="Clear the whole storage"><TrashIcon size={14} /></Button>
			</div>
		{/if}
	</div>
	<p class="mb-2 text-xs text-gray-400">
		Click a card to arm it, then click a binder slot - or drag it straight onto the page. Drag a card back here to pull it out of its slot.
		{#if placedCount > 0}<span class="text-gray-300">{placedCount} already placed.</span>{/if}
	</p>

	{#if $cards.length > 0}
		<div class="mb-2 flex items-end gap-1">
			<TextInput id="search-storage" label="Search storage:" bind:value={searchTerm} placeholder="Name, set, code..." />
			<div class="w-32 shrink-0">
				<Select
					id="sort-storage"
					activeCondition={sortBy !== 'type'}
					bind:value={sortBy}
					label="Sort by:"
					options={SORT_OPTIONS}
				/>
			</div>
			<Button class="px-2" onClick={toggleSortOrder} title={sortOrder === 'asc' ? 'Sorted ascending, click for descending' : 'Sorted descending, click for ascending'}>
				{#if sortOrder === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}
			</Button>
			<Button class="px-2" isActive={hidePlaced} onClick={toggleHidePlaced} title={hidePlaced ? 'Showing only the cards left to place' : 'Hide the cards already placed'}>
				<EyeOffIcon size={14} />
			</Button>
		</div>
	{/if}

	<div class="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
		{#if $cards.length === 0}
			<p class="py-4 text-center text-sm text-gray-500">No cards in storage yet - add a set, your collection, or search from the header.</p>
		{:else if filteredCardCodes.length === 0}
			<p class="py-4 text-center text-sm text-gray-500">No items match your search/filters.</p>
		{:else}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2" role="list">
				{#each filteredCardCodes as item (item)}
					{@const fullCard = isCardCode(item) ? cardDataMap.get(item) : undefined}
					{@const isPlaced = placedItems.has(item)}
					{#if isCardCode(item) && !fullCard}
						<div class="relative flex aspect-2/3 items-center justify-center rounded-sm border-2 border-dashed border-red-700 p-1 text-center">
							<span class="text-xs text-red-400">Data missing for {item}</span>
							<button class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white" onclick={() => removeItem(item)} aria-label="Remove from storage" title="Remove from storage"><X size={14} /></button>
						</div>
					{:else}
						{@const set = fullCard ? sets.find(s => s.name === fullCard.setName) : undefined}
						<div
							class="group relative aspect-2/3 rounded-sm border-2 transition-all duration-200 {selected === item ? 'border-gold-400 ring-2 ring-gold-400/50' : 'border-gray-700 hover:border-gold-400'} {isPlaced ? 'opacity-60' : ''}"
							draggable="true"
							ondragstart={e => onDragStart(e, item)}
							role="listitem"
						>
							<button
								class="absolute inset-0 h-full w-full cursor-pointer"
								onclick={() => toggleSelect(item)}
								title={selected === item ? 'Armed - click a slot to place it, or click again to cancel' : 'Arm this card for the next slot you click'}
							>
								<CardImage
									alt={fullCard?.name ?? 'Imported from URL'}
									class="h-full w-full rounded-[4%] object-contain p-1"
									imageUrl={fullCard?.image ?? item}
									lazy={true}
									types={fullCard?.types}
								/>
							</button>
							{#if isPlaced}
								<span class="absolute top-1 left-1 rounded-full bg-green-600 p-0.5 text-white" title="Already placed in the binder"><CheckIcon size={12} /></span>
							{/if}
			<!-- Arming a card also reveals its details, which is the only way to read them without a hover on touch screens. -->
							<div class="pointer-events-none absolute right-0 bottom-0 left-0 bg-black/75 p-1 text-center text-[0.6rem] leading-tight text-white transition-opacity group-hover:opacity-100 {selected === item ? 'opacity-100' : 'opacity-0'}">
								{#if fullCard}
									<div class="truncate font-semibold">{fullCard.name}</div>
									<div class="truncate">#{parseCardCode(item).cardNumber}/{set?.printedTotal}</div>
									<div class="truncate text-gray-300">{fullCard.rarity}</div>
									<div class="truncate text-gold-400">{prices[item]?.simple ? `${prices[item].simple.toFixed(2)} €` : 'No price'}</div>
								{:else}
									<div class="truncate font-semibold">Imported from URL</div>
								{/if}
							</div>
							<button class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100" onclick={() => removeItem(item)} aria-label="Remove from storage" title="Remove from storage"><X size={14} /></button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom scrollbar */
	.overflow-y-auto::-webkit-scrollbar { width: 6px; }
	.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
	.overflow-y-auto::-webkit-scrollbar-thumb { background-color: #4a4a4a; border-radius: 20px; }
	.overflow-y-auto::-webkit-scrollbar-thumb:hover { background-color: #FFB700; }
</style>
