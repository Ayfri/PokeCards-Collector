<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import PageTitle from '@components/PageTitle.svelte';
	import Button from '@components/filters/Button.svelte';
	import Checkbox from '@components/filters/Checkbox.svelte';
	import Select from '@components/filters/Select.svelte';
	import TextArea from '@components/filters/TextArea.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import BinderBoard from '@components/binder/BinderBoard.svelte';
	import BinderStorage from '@components/binder/BinderStorage.svelte';
	import BinderToolbar from '@components/binder/BinderToolbar.svelte';
	import README from '@components/binder/README.svelte';
	import Modal from '@components/ui/Modal.svelte';
	import HelpCircleIcon from '@lucide/svelte/icons/circle-question-mark';
	import { downloadDataUrl, renderBinderImage } from '$helpers/binder-export';
	import type { BinderCards, FullCard } from '$lib/types';
	import type { PageData } from './$types';

	interface Props {
		// Page data from server
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	// Binder configuration
	const rows = writable(3);
	const columns = writable(3);
	const pages = writable<Array<Array<BinderCards | null>>>([[]]);
	const currentPage = writable(0);
	const spread = writable(true);
	const storedCards = writable<string[]>([]);

	let selectedItem = $state<string | null>(null);
	let storageOrder = $state<string[]>([]);
	let exporting = $state(false);

	const showHelp = writable(false);
	const showSetModal = writable(false);
	const showUrlModal = writable(false);
	const showExportModal = writable(false);
	const showClearStorageModal = writable(false);
	const showMyCardsModal = writable(false);
	const selectedSet = writable('');
	const cardUrl = writable('');
	const multipleCardUrls = writable('');
	const includeCollection = writable(true);
	const includeWishlist = writable(true);

	// Exposed to SearchBar, which drops searched cards straight into the storage.
	setContext('storedCards', storedCards);

	const slotsPerPage = $derived($rows * $columns);
	const totalSlots = $derived($pages.length * slotsPerPage);
	const filledSlots = $derived($pages.reduce((total, page) => total + page.filter(Boolean).length, 0));
	/** A slot holds either a card code or a raw URL, and the storage keys on the same two shapes. */
	const placedItems = $derived(new Set($pages.flat().map(slot => slot?.cardCode ?? slot?.url).filter((key): key is string => Boolean(key))));
	/** Global index of the slot an armed card lands in: the first empty one from the current page onwards. */
	const nextEmpty = $derived.by(() => {
		if (!selectedItem) return -1;
		for (let page = $currentPage; page < $pages.length; page++) {
			const position = $pages[page].findIndex(slot => !slot);
			if (position !== -1) return page * slotsPerPage + position;
		}
		return -1;
	});

	function emptyPage(): Array<BinderCards | null> {
		return Array($rows * $columns).fill(null);
	}

	function saveToLocalStorage() {
		if (!browser) return;
		try {
			window.localStorage.setItem('binderGridData', JSON.stringify({ columns: $columns, pages: $pages, rows: $rows, spread: $spread }));
			window.localStorage.setItem('binderStoredCards', JSON.stringify($storedCards));
		} catch (e) { console.error('Erreur de sauvegarde:', e); }
	}

	function loadFromLocalStorage() {
		if (!browser) return;
		try {
			const storedDataString = window.localStorage.getItem('binderStoredCards');
			if (storedDataString) {
				const parsed = JSON.parse(storedDataString);
				if (Array.isArray(parsed)) {
					if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && 'url' in parsed[0]) {
						// Pre-cardCode storage kept raw image URLs, so they are matched back onto the catalogue once.
						const migratedCardCodes: string[] = [];
						for (const oldCard of parsed) {
							if (typeof oldCard.url !== 'string') continue;
							const foundCard = data.allCards.find(card => card.image === oldCard.url);
							if (foundCard) migratedCardCodes.push(foundCard.cardCode);
						}
						$storedCards = [...new Set(migratedCardCodes)];
						saveToLocalStorage();
					} else if (parsed.every(item => typeof item === 'string')) {
						$storedCards = parsed;
					} else {
						console.warn('Invalid format found in binderStoredCards, resetting.');
						$storedCards = [];
					}
				}
			}

			const binderDataString = window.localStorage.getItem('binderGridData');
			if (!binderDataString) {
				$pages = [emptyPage()];
				return;
			}

			const binderData = JSON.parse(binderDataString);
			if (typeof binderData.rows === 'number' && typeof binderData.columns === 'number') {
				$rows = Math.max(1, binderData.rows);
				$columns = Math.max(1, binderData.columns);
			}
			if (typeof binderData.spread === 'boolean') $spread = binderData.spread;

			if (Array.isArray(binderData.pages)) {
				$pages = binderData.pages.length ? binderData.pages : [emptyPage()];
			} else if (Array.isArray(binderData.cards)) {
				// Single-grid layout from before the binder held several pages.
				$pages = [binderData.cards];
			} else {
				$pages = [emptyPage()];
			}
		} catch (e) {
			console.error('Erreur de chargement:', e);
			$pages = [emptyPage()];
			$storedCards = [];
		}
	}

	onMount(() => {
		loadFromLocalStorage();
		const unsubscribers = [pages, storedCards, rows, columns, spread].map(store => store.subscribe(saveToLocalStorage));

		const handleAddToBinder = (event: Event) => {
			const codeToAdd: string | undefined = (event as CustomEvent).detail?.cardCode;
			if (!codeToAdd) {
				console.warn('add-to-binder event triggered without cardCode in detail.');
				return;
			}
			if (!$storedCards.includes(codeToAdd)) $storedCards = [...$storedCards, codeToAdd];
		};
		document.addEventListener('add-to-binder', handleAddToBinder);

		return () => {
			document.removeEventListener('add-to-binder', handleAddToBinder);
			unsubscribers.forEach(unsubscribe => unsubscribe());
		};
	});

	// Resizing the pocket layout keeps whatever fits and drops the overflow, page by page.
	$effect(() => {
		const size = $rows * $columns;
		if ($pages.every(page => page.length === size)) return;
		$pages = $pages.map(page => {
			const resized: Array<BinderCards | null> = Array(size).fill(null);
			page.forEach((card, index) => { if (card && index < size) resized[index] = { ...card, position: index }; });
			return resized;
		});
	});

	$effect(() => { if ($currentPage > $pages.length - 1) $currentPage = Math.max(0, $pages.length - 1); });

	function updatePage(pageIndex: number, updater: (page: Array<BinderCards | null>) => Array<BinderCards | null>) {
		$pages = $pages.map((page, index) => (index === pageIndex ? updater([...page]) : page));
	}

	function makeSlot(url: string, cardCode: string | undefined, position: number): BinderCards {
		return { cardCode, id: crypto.randomUUID(), position, url };
	}

	function handleDrop(pageIndex: number, position: number, event: DragEvent) {
		const sourceType = event.dataTransfer?.getData('source-type');

		if (sourceType === 'storage' || sourceType === 'storage-url') {
			const url = event.dataTransfer?.getData('cardUrl');
			if (!url) return;
			const cardCode = sourceType === 'storage' ? event.dataTransfer?.getData('cardCode') || undefined : undefined;
			updatePage(pageIndex, page => { page[position] = makeSlot(url, cardCode, position); return page; });
			return;
		}

		if (sourceType !== 'binder') return;

		const sourcePage = parseInt(event.dataTransfer?.getData('source-page') ?? '-1');
		const sourcePosition = parseInt(event.dataTransfer?.getData('source-position') ?? '-1');
		if (sourcePage < 0 || sourcePosition < 0 || (sourcePage === pageIndex && sourcePosition === position)) return;

		const sourceCard = $pages[sourcePage]?.[sourcePosition];
		if (!sourceCard) return;
		const targetCard = $pages[pageIndex]?.[position] ?? null;

		$pages = $pages.map((page, index) => {
			if (index !== sourcePage && index !== pageIndex) return page;
			const next = [...page];
			if (index === sourcePage) next[sourcePosition] = targetCard ? { ...targetCard, position: sourcePosition } : null;
			if (index === pageIndex) next[position] = { ...sourceCard, position };
			return next;
		});
	}

	function handleSlotClick(pageIndex: number, position: number) {
		if (!selectedItem) return;
		const item = selectedItem;
		const fullCard = data.allCards.find((card: FullCard) => card.cardCode === item);
		updatePage(pageIndex, page => {
			page[position] = makeSlot(fullCard?.image ?? item, fullCard?.cardCode, position);
			return page;
		});
		selectedItem = null;
	}

	function removeCard(pageIndex: number, position: number) {
		updatePage(pageIndex, page => { page[position] = null; return page; });
	}

	/** Dropping a slot back onto the storage empties it, and puts the card back in the list if it had been removed. */
	function handleStorageDrop(event: DragEvent) {
		if (event.dataTransfer?.getData('source-type') !== 'binder') return;
		const pageIndex = parseInt(event.dataTransfer.getData('source-page'));
		const position = parseInt(event.dataTransfer.getData('source-position'));
		const card = $pages[pageIndex]?.[position];
		if (!card) return;
		removeCard(pageIndex, position);
		addToStorage([card.cardCode ?? card.url]);
	}

	function addPage() {
		$pages = [...$pages, emptyPage()];
		$currentPage = $pages.length - 1;
	}

	function duplicatePages(pageIndices: number[]) {
		const copies = pageIndices.map(index => $pages[index].map(slot => (slot ? { ...slot, id: crypto.randomUUID() } : null)));
		const after = pageIndices[pageIndices.length - 1] + 1;
		$pages = [...$pages.slice(0, after), ...copies, ...$pages.slice(after)];
		$currentPage = after;
	}

	function clearPages(pageIndices: number[]) {
		$pages = $pages.map((page, index) => (pageIndices.includes(index) ? emptyPage() : page));
	}

	function deletePages(pageIndices: number[]) {
		const kept = $pages.filter((_, index) => !pageIndices.includes(index));
		$pages = kept.length ? kept : [emptyPage()];
		$currentPage = Math.min($currentPage, $pages.length - 1);
	}

	function resetAllPages() {
		$pages = $pages.map(() => emptyPage());
	}

	/** Pours everything still unplaced into the empty slots, appending pages until the storage runs out. */
	function autoFill() {
		const queue = (storageOrder.length ? storageOrder : $storedCards).filter(item => !placedItems.has(item));
		if (!queue.length) return;

		const nextPages = $pages.map(page => [...page]);
		let pageIndex = 0;
		for (const item of queue) {
			const fullCard = data.allCards.find((card: FullCard) => card.cardCode === item);
			let position = -1;
			while (position === -1) {
				if (pageIndex >= nextPages.length) nextPages.push(emptyPage());
				position = nextPages[pageIndex].findIndex(slot => !slot);
				if (position === -1) pageIndex++;
			}
			nextPages[pageIndex][position] = makeSlot(fullCard?.image ?? item, fullCard?.cardCode, position);
		}

		$pages = nextPages;
		selectedItem = null;
	}

	function toggleHelp() { $showHelp = !$showHelp; }
	function toggleSetModal() {
		$showSetModal = !$showSetModal;
		if (!$showSetModal) $selectedSet = '';
	}
	function toggleUrlModal() {
		$showUrlModal = !$showUrlModal;
		if (!$showUrlModal) { $cardUrl = ''; $multipleCardUrls = ''; }
	}
	function toggleMyCardsModal() { $showMyCardsModal = !$showMyCardsModal; }
	function toggleClearStorageModal() { $showClearStorageModal = !$showClearStorageModal; }
	function toggleExportModal() { $showExportModal = !$showExportModal; }

	function addToStorage(codes: string[]) {
		const current = new Set($storedCards);
		const additions = [...new Set(codes)].filter(code => !current.has(code));
		if (additions.length) $storedCards = [...$storedCards, ...additions];
	}

	function clearAllStoredCards() {
		$storedCards = [];
		selectedItem = null;
		toggleClearStorageModal();
	}

	function addSetToStorage() {
		if (!$selectedSet) return;
		addToStorage(data.allCards.filter((card: FullCard) => card.setName === $selectedSet).map((card: FullCard) => card.cardCode));
		toggleSetModal();
	}

	function addMyCardsToStorage() {
		const codes: string[] = [];
		if ($includeCollection && data.serverCollectionCards) codes.push(...data.serverCollectionCards.map((card: FullCard) => card.cardCode));
		if ($includeWishlist && data.serverWishlistCards) codes.push(...data.serverWishlistCards.map((card: FullCard) => card.cardCode));
		addToStorage(codes);
		toggleMyCardsModal();
	}

	function addCardFromUrl() {
		const candidates = [$cardUrl, ...$multipleCardUrls.split(/[\n;]/)]
			.map(url => url.trim().replace(/\.$/, ''))
			.filter(url => url.startsWith('http'));
		addToStorage(candidates);
		toggleUrlModal();
	}

	async function exportBinder(scope: 'page' | 'all') {
		if (!browser) return;
		toggleExportModal();
		exporting = true;
		try {
			const target = scope === 'all' ? $pages : [$pages[$currentPage]];
			const dataUrl = await renderBinderImage({ columns: $columns, pages: target, rows: $rows, username: data.profile?.username });
			downloadDataUrl(dataUrl, scope === 'all' ? 'binder-all-pages.png' : `binder-page-${$currentPage + 1}.png`);
		} catch (error) {
			console.error('Error generating binder image:', error);
			alert('An error occurred while generating the image.');
		} finally {
			exporting = false;
		}
	}
</script>

<README showHelp={$showHelp} toggleHelp={toggleHelp} />

<div class="-mt-6 flex flex-col gap-4 p-4 md:p-6 lg:-mt-12">
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-3">
			<PageTitle title="Binder Builder" />
			<Button class="mt-1 p-1.5" onClick={toggleHelp} title="How the Binder Builder works">
				<HelpCircleIcon size={20} />
			</Button>
		</div>

		<div class="flex flex-wrap gap-2 text-xs">
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{$pages.length} page{$pages.length > 1 ? 's' : ''} of {slotsPerPage}</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{filledSlots}/{totalSlots} slots filled</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{$storedCards.length - placedItems.size} left in storage</span>
			{#if exporting}<span class="rounded-full bg-gold-500 px-3 py-1 text-black">Rendering image...</span>{/if}
		</div>
	</div>

	<BinderToolbar
		bind:columns={$columns}
		bind:rows={$rows}
		bind:spread={$spread}
		onAddSet={toggleSetModal}
		onAddUrl={toggleUrlModal}
		onExport={toggleExportModal}
		onMyCards={toggleMyCardsModal}
		onResetAll={resetAllPages}
	/>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-12">
		<div class="h-[calc(100dvh-19rem)] min-h-[26rem] lg:col-span-8">
			<BinderBoard
				columns={$columns}
				currentPage={$currentPage}
				{nextEmpty}
				onAddPage={addPage}
				onClearPages={clearPages}
				onDeletePages={deletePages}
				onDrop={handleDrop}
				onDuplicatePages={duplicatePages}
				onGoTo={index => ($currentPage = index)}
				onRemove={removeCard}
				onSlotClick={handleSlotClick}
				pages={$pages}
				rows={$rows}
				spread={$spread}
			/>
		</div>

		<div class="h-[calc(100dvh-19rem)] min-h-[26rem] lg:col-span-4">
			<BinderStorage
				allCards={data.allCards}
				bind:visibleItems={storageOrder}
				cards={storedCards}
				onAutoFill={autoFill}
				onDropFromBinder={handleStorageDrop}
				onSelect={item => (selectedItem = item)}
				{placedItems}
				prices={data.prices}
				selected={selectedItem}
				{sets}
				{toggleClearStorageModal}
			/>
		</div>
	</div>
</div>

<!-- Set Selection Modal -->
<Modal bind:open={$showSetModal} onClose={toggleSetModal} title="Add complete set">
	<p class="mb-4 text-sm text-gray-300">Choose a set to send all of its cards to the storage.</p>

	<div class="mb-4">
		<Select
			id="set-select"
			bind:value={$selectedSet}
			label="Choose a set:"
			options={data.sets
				.slice()
				.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
				.map(set => ({
					label: `${set.name} (${new Date(set.releaseDate).toLocaleDateString()}) - ${set.printedTotal} cards`,
					value: set.name
				}))}
			placeholder="-- Select a set --"
		/>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleSetModal}>Cancel</Button>
		<Button class="bg-gold-500 px-4 py-2 text-sm text-black hover:bg-gold-600 disabled:opacity-50" disabled={!$selectedSet} onClick={addSetToStorage}>Add set</Button>
	{/snippet}
</Modal>

<!-- My Cards Modal -->
<Modal bind:open={$showMyCardsModal} onClose={toggleMyCardsModal} title="Add my cards">
	<p class="mb-4 text-sm text-gray-300">Choose which cards to send to the storage.</p>

	<div class="mb-4 flex flex-col gap-4">
		<Checkbox id="include-collection" bind:checked={$includeCollection} disabled={!data.serverCollectionCards} label="Include my collection" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if data.serverCollectionCards}{data.serverCollectionCards.length} cards in your collection{:else}You need to be logged in to access your collection{/if}
		</p>

		<Checkbox id="include-wishlist" bind:checked={$includeWishlist} disabled={!data.serverWishlistCards} label="Include my wishlist" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if data.serverWishlistCards}{data.serverWishlistCards.length} cards in your wishlist{:else}You need to be logged in to access your wishlist{/if}
		</p>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleMyCardsModal}>Cancel</Button>
		<Button
			class="bg-gold-500 px-4 py-2 text-sm text-black hover:bg-gold-600 disabled:opacity-50"
			disabled={(!$includeCollection || !data.serverCollectionCards) && (!$includeWishlist || !data.serverWishlistCards)}
			onClick={addMyCardsToStorage}
		>
			Add to storage
		</Button>
	{/snippet}
</Modal>

<!-- URL Card Modal -->
<Modal bind:open={$showUrlModal} onClose={toggleUrlModal} title="Add card from URL">
	<p class="mb-4 text-sm text-gray-300">
		Paste image URLs to add them to the storage. URLs must start with 'http', and several can be separated by line breaks or semicolons.
	</p>
	<div class="mb-4">
		<TextInput id="cardUrl" bind:value={$cardUrl} label="Single card image URL" placeholder="https://assets.tcgdex.net/..." type="url" />
	</div>
	<div class="mb-4">
		<TextArea
			id="multipleCardUrls"
			bind:value={$multipleCardUrls}
			class="max-h-80 overflow-y-auto"
			label="Or multiple URLs (one per line)"
			placeholder={'https://example.com/card1.png\nhttps://example.com/card2.png'}
			rows={4}
		/>
	</div>
	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleUrlModal}>Cancel</Button>
		<Button class="bg-gold-500 px-4 py-2 text-sm text-black hover:bg-gold-600 disabled:opacity-50" disabled={!$cardUrl && !$multipleCardUrls} onClick={addCardFromUrl}>Add card(s)</Button>
	{/snippet}
</Modal>

<!-- Export Modal -->
<Modal bind:open={$showExportModal} onClose={toggleExportModal} title="Export as image">
	<p class="mb-4 text-sm text-gray-300">
		Pages render at 300px per card, numbered slot by slot so you can follow the sheet while filling the real binder.
	</p>
	{#if filledSlots < totalSlots}
		<p class="mb-4 rounded-sm bg-gray-900 p-2 text-xs text-gray-400">Some slots are still empty - they export as numbered placeholders.</p>
	{/if}

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleExportModal}>Cancel</Button>
		<Button class="px-4 py-2 text-sm" onClick={() => exportBinder('page')}>Current page</Button>
		<Button class="bg-gold-500 px-4 py-2 text-sm text-black hover:bg-gold-600" onClick={() => exportBinder('all')}>All {$pages.length} pages</Button>
	{/snippet}
</Modal>

<!-- Clear Storage Confirmation Modal -->
<Modal bind:open={$showClearStorageModal} onClose={toggleClearStorageModal} title="Clear Storage">
	<p class="mb-4 text-gray-300">Are you sure you want to remove all stored cards? This cannot be undone.</p>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleClearStorageModal}>Cancel</Button>
		<Button class="bg-gold-500 px-4 py-2 text-sm text-black hover:bg-gold-600" onClick={clearAllStoredCards}>Clear all cards</Button>
	{/snippet}
</Modal>
