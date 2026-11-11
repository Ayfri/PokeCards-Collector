<script lang="ts">
	import { formatEuros } from '#helpers/format.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { DRAG_TYPE, MAX_FILL, readDrag, setDrag } from '#helpers/binder.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import Button from '#components/filters/Button.svelte';
	import CardImage from '#components/card/CardImage.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import Select from '#components/filters/Select.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import BookUserIcon from '@lucide/svelte/icons/book-user';
	import CheckIcon from '@lucide/svelte/icons/check';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LinkIcon from '@lucide/svelte/icons/link';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import X from '@lucide/svelte/icons/x';
	import { formatCardNumber, isCardCode } from '#helpers/card-utils.ts';
	import type { Set } from '#lib/types.js';

	interface Props {
		onAddSet: () => void;
		onAddUrl: () => void;
		/** Called when a tile gets armed, so a phone can flip back to the board. */
		onArm?: () => void;
		onClear: () => void;
		onMyCards: () => void;
		sets: Set[];
	}

	let { onAddSet, onAddUrl, onArm, onClear, onMyCards, sets }: Props = $props();

	let searchTerm = $state('');

	/** How the storage is displayed, kept across visits since the binder is built over several sessions. */
	const view = persistedRecord('binder-storage-view', { hidePlaced: false, sortBy: 'type', sortOrder: 'asc' });

	const filteredCardCodes = $derived.by(() => {
		let filtered = [...binder.tray];

		if (view.hidePlaced) filtered = filtered.filter(item => !binder.placed.has(item));

		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(item => {
				if (isCardCode(item)) {
					const fullCard = binderCards.byCode.get(item);
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

			if (isCodeA && !isCodeB) return -1;
			if (!isCodeA && isCodeB) return 1;

			let comparison = 0;
			if (isCodeA && isCodeB) {
				const cardA = binderCards.byCode.get(itemA);
				const cardB = binderCards.byCode.get(itemB);
				const byNumber = () => (cardA?.localId ?? '').localeCompare(cardB?.localId ?? '', undefined, {numeric: true});
				if (view.sortBy === 'number') {
					comparison = byNumber();
					if (comparison === 0) comparison = (cardA?.name ?? '').localeCompare(cardB?.name ?? '');
				} else if (view.sortBy === 'set') {
					comparison = (cardA?.setId ?? '').localeCompare(cardB?.setId ?? '');
					if (comparison === 0) comparison = byNumber();
				} else if (view.sortBy === 'name') {
					comparison = (cardA?.name ?? '').localeCompare(cardB?.name ?? '');
				} else if (view.sortBy === 'price') {
					comparison = (cardA?.price ?? 0) - (cardB?.price ?? 0);
				}
			} else if (!isCodeA && !isCodeB) {
				comparison = itemA.localeCompare(itemB);
			}

			return view.sortOrder === 'asc' ? comparison : -comparison;
		});

		return filtered;
	});

	/** The list as displayed, so auto-fill pours cards in the order the user sorted them. */
	const unplacedCount = $derived(filteredCardCodes.filter(item => !binder.placed.has(item)).length);
	const placedCount = $derived(binder.tray.length - binder.trayLeft);

	function toggleSelect(item: string) {
		binder.armed = binder.armed === item ? null : item;
		if (binder.armed) onArm?.();
	}

	const SORT_OPTIONS = [
		{ label: 'Added order', value: 'type' },
		{ label: 'Card number', value: 'number' },
		{ label: 'Set', value: 'set' },
		{ label: 'Name', value: 'name' },
		{ label: 'Price', value: 'price' }
	];

	function toggleSortOrder() {
		view.sortOrder = view.sortOrder === 'asc' ? 'desc' : 'asc';
	}

	let dropActive = $state(false);

	function handleDragOver(event: DragEvent) {
		if (!event.dataTransfer?.types.includes(DRAG_TYPE)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		dropActive = true;
	}

	/** Dropping a binder card back here pulls it out of its slot. */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dropActive = false;
		const payload = readDrag(event);
		if (payload?.kind === 'slot') binder.remove({ page: payload.page, position: payload.position });
	}

	function toggleHidePlaced() {
		view.hidePlaced = !view.hidePlaced;
	}
</script>

<div
	aria-label="Card storage"
	class="flex h-full flex-col rounded-2xl bg-gray-800 p-4 transition-colors {dropActive ? 'ring-2 ring-gold-400' : ''}"
	ondragleave={() => (dropActive = false)}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="region"
>
	<div class="mb-1 flex items-center justify-between">
		<h3 class="text-lg text-gold-400">Storage ({binder.tray.length})</h3>
		{#if binder.tray.length > 0}
			<div class="flex items-center gap-1">
				<Button class="border-gold-400 px-2 text-xs text-gold-400 disabled:opacity-50" disabled={!binderCards.ready || !unplacedCount || unplacedCount > MAX_FILL} onClick={() => binder.fill(filteredCardCodes)} title="Pour the storage into the empty slots, in the order it is sorted">
					<WandSparklesIcon size={14} /> Auto-fill
				</Button>
				<Button class="p-1" onClick={onClear} title="Clear the whole storage"><TrashIcon size={14} /></Button>
			</div>
		{/if}
	</div>
	<div class="mb-2 flex flex-wrap gap-1">
		<Button class="px-2 text-xs" onClick={onAddSet} title="Send a whole set to the storage">
			<LayersIcon size={14} /> Add set
		</Button>
		<Button class="px-2 text-xs" onClick={onMyCards} title="Send your collection or wishlist to the storage">
			<BookUserIcon size={14} /> My cards
		</Button>
		<Button class="px-2 text-xs" onClick={onAddUrl} title="Add cards from image URLs">
			<LinkIcon size={14} /> URL
		</Button>
	</div>
	<p class="mb-2 text-xs text-gray-400">
		Click a card to arm it, then click a binder slot - or drag it straight onto the page. Drag a card back here to pull it out of its slot.
		{#if placedCount > 0}<span class="text-gray-300">{placedCount} already placed.</span>{/if}
	</p>

	{#if binder.tray.length > 0}
		<div class="mb-2 flex items-end gap-1">
			<TextInput bind:value={searchTerm} id="search-storage" label="Search storage:" placeholder="Name, set, code..." />
			<div class="w-32 shrink-0">
				<Select
					activeCondition={view.sortBy !== 'type'}
					bind:value={view.sortBy}
					id="sort-storage"
					label="Sort by:"
					options={SORT_OPTIONS}
				/>
			</div>
			<Button class="px-2" onClick={toggleSortOrder} title={view.sortOrder === 'asc' ? 'Sorted ascending, click for descending' : 'Sorted descending, click for ascending'}>
				{#if view.sortOrder === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}
			</Button>
			<Button class="px-2" isActive={view.hidePlaced} onClick={toggleHidePlaced} title={view.hidePlaced ? 'Showing only the cards left to place' : 'Hide the cards already placed'}>
				<EyeOffIcon size={14} />
			</Button>
		</div>
	{/if}

	<div class="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
		{#if binder.tray.length === 0}
			<p class="py-4 text-center text-sm text-gray-500">No cards in storage yet - add a set, your collection, or search from the header.</p>
		{:else if filteredCardCodes.length === 0}
			<p class="py-4 text-center text-sm text-gray-500">No items match your search/filters.</p>
		{:else}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2" role="list">
				{#each filteredCardCodes as item (item)}
					{@const fullCard = isCardCode(item) ? binderCards.byCode.get(item) : undefined}
					{@const isPlaced = binder.placed.has(item)}
					{#if isCardCode(item) && !fullCard && !binderCards.ready}
						<div class="aspect-2/3 animate-pulse rounded-sm border-2 border-gray-700 bg-gray-700/50"></div>
					{:else if isCardCode(item) && !fullCard}
						<div class="relative flex aspect-2/3 items-center justify-center rounded-sm border-2 border-dashed border-red-700 p-1 text-center">
							<span class="text-xs text-red-400">Data missing for {item}</span>
							<button aria-label="Remove from storage" class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white" onclick={() => binder.removeFromTray(item)} title="Remove from storage"><X size={14} /></button>
						</div>
					{:else}
						{@const set = fullCard ? sets.find(s => s.setId === fullCard.setId) : undefined}
						<div
							class="group relative aspect-2/3 rounded-sm border-2 transition-all duration-200 {binder.armed === item ? 'border-gold-400 ring-2 ring-gold-400/50' : 'border-gray-700 hover:border-gold-400'} {isPlaced ? 'opacity-60' : ''}"
							draggable="true"
							ondragstart={event => setDrag(event, { key: item, kind: 'card' })}
							role="listitem"
						>
							<button
								class="absolute inset-0 h-full w-full cursor-pointer"
								onclick={() => toggleSelect(item)}
								title={binder.armed === item ? 'Armed - click a slot to place it, or click again to cancel' : 'Arm this card for the next slot you click'}
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
							<div class="pointer-events-none absolute right-0 bottom-0 left-0 bg-black/75 p-1 text-center text-[0.6rem] leading-tight text-white transition-opacity group-hover:opacity-100 {binder.armed === item ? 'opacity-100' : 'opacity-0'}">
								{#if fullCard}
									<div class="truncate font-semibold">{fullCard.name}</div>
									<div class="truncate">#{formatCardNumber(fullCard.localId || '?', set?.printedTotal)}</div>
									<div class="flex items-center justify-center gap-1 truncate text-gray-300"><RaritySymbol decorative rarity={fullCard.rarity} />{fullCard.rarity}</div>
									<div class="truncate text-gold-400">{fullCard.price ? formatEuros(fullCard.price) : 'No price'}</div>
								{:else}
									<div class="truncate font-semibold">Imported from URL</div>
								{/if}
							</div>
							<button aria-label="Remove from storage" class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100" onclick={() => binder.removeFromTray(item)} title="Remove from storage"><X size={14} /></button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

