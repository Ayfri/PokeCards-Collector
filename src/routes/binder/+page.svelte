<script lang="ts">
	import { onMount } from 'svelte';
	import PageTitle from '#components/PageTitle.svelte';
	import Button from '#components/filters/Button.svelte';
	import Checkbox from '#components/filters/Checkbox.svelte';
	import Select from '#components/filters/Select.svelte';
	import TextArea from '#components/filters/TextArea.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import BinderBoard from '#components/binder/BinderBoard.svelte';
	import BinderStorage from '#components/binder/BinderStorage.svelte';
	import BinderToolbar from '#components/binder/BinderToolbar.svelte';
	import BinderHelp from '#components/binder/BinderHelp.svelte';
	import Modal from '#components/ui/Modal.svelte';
	import HelpCircleIcon from '@lucide/svelte/icons/circle-question-mark';
	import { downloadDataUrl, renderBinderImage } from '#helpers/binder-export.ts';
	import { setCardCount } from '#helpers/card-utils.ts';
	import type { BinderCatalogueCard, BinderSlot } from '#lib/types.js';
	import { binderStorage } from '#stores/binder.svelte.ts';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	/** Fetched from `/api/binder` rather than sent in the document, so the page paints before the catalogue arrives. */
	let catalogue = $state.raw<BinderCatalogueCard[]>([]);
	const cardsByCode = $derived(new Map(catalogue.map(card => [card.cardCode, card])));
	const loggedIn = $derived(Boolean(data.profile));
	const catalogueReady = $derived(catalogue.length > 0);

	let rows = $state(3);
	let columns = $state(3);
	/** Raw: every write replaces the page arrays (`updatePage` mutates a copy), none writes into one in place. */
	let pages = $state.raw<Array<Array<BinderSlot | null>>>([[]]);
	let currentPage = $state(0);
	let spread = $state(true);

	let selectedItem = $state<string | null>(null);
	let storageOrder = $state<string[]>([]);
	let exporting = $state(false);
	/** Saving only starts once the stored binder is loaded, so the empty defaults never overwrite it. */
	let loaded = $state(false);

	let showHelp = $state(false);
	let showSetModal = $state(false);
	let showUrlModal = $state(false);
	let showExportModal = $state(false);
	let showClearStorageModal = $state(false);
	let showMyCardsModal = $state(false);
	let selectedSet = $state('');
	let cardUrl = $state('');
	let multipleCardUrls = $state('');
	let includeCollection = $state(true);
	let includeWishlist = $state(true);

	const slotsPerPage = $derived(rows * columns);
	const totalSlots = $derived(pages.length * slotsPerPage);
	const filledSlots = $derived(pages.reduce((total, page) => total + page.filter(Boolean).length, 0));
	/** A slot holds either a card code or a raw URL, and the storage uses the same two kinds of key. */
	const placedItems = $derived(new Set(pages.flat().map(slot => slot?.cardCode ?? slot?.url).filter((key): key is string => Boolean(key))));
	/** Global index of the slot an armed card lands in: the first empty one from the current page onwards. */
	const nextEmpty = $derived.by(() => {
		if (!selectedItem) return -1;
		for (let page = currentPage; page < pages.length; page++) {
			const position = pages[page].findIndex(slot => !slot);
			if (position !== -1) return page * slotsPerPage + position;
		}
		return -1;
	});

	function emptyPage(): Array<BinderSlot | null> {
		return Array(rows * columns).fill(null);
	}

	function saveToLocalStorage() {
		try {
			window.localStorage.setItem('binderGridData', JSON.stringify({ columns, pages, rows, spread }));
			window.localStorage.setItem('binderStoredCards', JSON.stringify(binderStorage.cards));
		} catch (e) { console.error('Failed to save the binder:', e); }
	}

	function loadFromLocalStorage() {
		try {
			const storedDataString = window.localStorage.getItem('binderStoredCards');
			if (storedDataString) {
				const parsed = JSON.parse(storedDataString);
				if (Array.isArray(parsed)) {
					if (parsed.every(item => typeof item === 'string')) {
						binderStorage.cards = parsed;
					} else {
						console.warn('Invalid format found in binderStoredCards, resetting.');
						binderStorage.cards = [];
					}
				}
			}

			const binderDataString = window.localStorage.getItem('binderGridData');
			if (!binderDataString) {
				pages = [emptyPage()];
				return;
			}

			const binderData = JSON.parse(binderDataString);
			if (typeof binderData.rows === 'number' && typeof binderData.columns === 'number') {
				rows = Math.max(1, binderData.rows);
				columns = Math.max(1, binderData.columns);
			}
			if (typeof binderData.spread === 'boolean') spread = binderData.spread;

			if (Array.isArray(binderData.pages)) {
				pages = binderData.pages.length ? binderData.pages : [emptyPage()];
			} else {
				pages = [emptyPage()];
			}
		} catch (e) {
			console.error('Failed to load the binder:', e);
			pages = [emptyPage()];
			binderStorage.cards = [];
		}
	}

	onMount(() => {
		loadFromLocalStorage();
		loaded = true;

		data.catalogue.then(cards => {
			catalogue = cards;
		}).catch(error => console.error('Failed to load the card catalogue:', error));
	});

	$effect(() => {
		if (loaded) saveToLocalStorage();
	});

	/** Resizing the pocket grid keeps the cards that still fit and drops the overflow, page by page. */
	$effect(() => {
		const size = rows * columns;
		if (pages.every(page => page.length === size)) return;
		pages = pages.map(page => {
			const resized: Array<BinderSlot | null> = Array(size).fill(null);
			page.forEach((card, index) => { if (card && index < size) resized[index] = { ...card, position: index }; });
			return resized;
		});
	});

	$effect(() => { if (currentPage > pages.length - 1) currentPage = Math.max(0, pages.length - 1); });

	function updatePage(pageIndex: number, updater: (page: Array<BinderSlot | null>) => Array<BinderSlot | null>) {
		pages = pages.map((page, index) => (index === pageIndex ? updater([...page]) : page));
	}

	function makeSlot(url: string, cardCode: string | undefined, position: number): BinderSlot {
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

		const sourceCard = pages[sourcePage]?.[sourcePosition];
		if (!sourceCard) return;
		const targetCard = pages[pageIndex]?.[position] ?? null;

		pages = pages.map((page, index) => {
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
		const fullCard = cardsByCode.get(item);
		updatePage(pageIndex, page => {
			page[position] = makeSlot(fullCard?.image ?? item, fullCard?.cardCode, position);
			return page;
		});
		selectedItem = null;
	}

	function removeCard(pageIndex: number, position: number) {
		updatePage(pageIndex, page => { page[position] = null; return page; });
	}

	/** Dropping a slot back onto the storage empties it and puts the card back in the list if it was removed. */
	function handleStorageDrop(event: DragEvent) {
		if (event.dataTransfer?.getData('source-type') !== 'binder') return;
		const pageIndex = parseInt(event.dataTransfer.getData('source-page'));
		const position = parseInt(event.dataTransfer.getData('source-position'));
		const card = pages[pageIndex]?.[position];
		if (!card) return;
		removeCard(pageIndex, position);
		binderStorage.add([card.cardCode ?? card.url]);
	}

	function addPage() {
		pages = [...pages, emptyPage()];
		currentPage = pages.length - 1;
	}

	function duplicatePages(pageIndices: number[]) {
		const copies = pageIndices.map(index => pages[index].map(slot => (slot ? { ...slot, id: crypto.randomUUID() } : null)));
		const after = pageIndices[pageIndices.length - 1] + 1;
		pages = [...pages.slice(0, after), ...copies, ...pages.slice(after)];
		currentPage = after;
	}

	function clearPages(pageIndices: number[]) {
		pages = pages.map((page, index) => (pageIndices.includes(index) ? emptyPage() : page));
	}

	function deletePages(pageIndices: number[]) {
		const kept = pages.filter((_, index) => !pageIndices.includes(index));
		pages = kept.length ? kept : [emptyPage()];
		currentPage = Math.min(currentPage, pages.length - 1);
	}

	function resetAllPages() {
		pages = pages.map(() => emptyPage());
	}

	/** Fills the empty slots with every unplaced card, adding pages until the storage is empty. */
	function autoFill() {
		const queue = (storageOrder.length ? storageOrder : binderStorage.cards).filter(item => !placedItems.has(item));
		if (!queue.length) return;

		const nextPages = pages.map(page => [...page]);
		let pageIndex = 0;
		for (const item of queue) {
			const fullCard = cardsByCode.get(item);
			let position = -1;
			while (position === -1) {
				if (pageIndex >= nextPages.length) nextPages.push(emptyPage());
				position = nextPages[pageIndex].findIndex(slot => !slot);
				if (position === -1) pageIndex++;
			}
			nextPages[pageIndex][position] = makeSlot(fullCard?.image ?? item, fullCard?.cardCode, position);
		}

		pages = nextPages;
		selectedItem = null;
	}

	function toggleHelp() { showHelp = !showHelp; }
	function toggleSetModal() {
		showSetModal = !showSetModal;
		if (!showSetModal) selectedSet = '';
	}
	function toggleUrlModal() {
		showUrlModal = !showUrlModal;
		if (!showUrlModal) { cardUrl = ''; multipleCardUrls = ''; }
	}
	function toggleMyCardsModal() { showMyCardsModal = !showMyCardsModal; }
	function toggleClearStorageModal() { showClearStorageModal = !showClearStorageModal; }
	function toggleExportModal() { showExportModal = !showExportModal; }

	function clearAllStoredCards() {
		binderStorage.clear();
		selectedItem = null;
		toggleClearStorageModal();
	}

	function addSetToStorage() {
		if (!selectedSet) return;
		binderStorage.add(catalogue.filter(card => card.setName === selectedSet).map(card => card.cardCode));
		toggleSetModal();
	}

	function addMyCardsToStorage() {
		const codes: string[] = [];
		if (includeCollection) codes.push(...data.collectionCodes);
		if (includeWishlist) codes.push(...data.wishlistCodes);
		binderStorage.add(codes);
		toggleMyCardsModal();
	}

	function addCardFromUrl() {
		const candidates = [cardUrl, ...multipleCardUrls.split(/[\n;]/)]
			.map(url => url.trim().replace(/\.$/, ''))
			.filter(url => url.startsWith('http'));
		binderStorage.add(candidates);
		toggleUrlModal();
	}

	async function exportBinder(scope: 'page' | 'all') {
		toggleExportModal();
		exporting = true;
		try {
			const target = scope === 'all' ? pages : [pages[currentPage]];
			const dataUrl = await renderBinderImage({ columns: columns, pages: target, rows: rows, username: data.profile?.username });
			downloadDataUrl(dataUrl, scope === 'all' ? 'binder-all-pages.png' : `binder-page-${currentPage + 1}.png`);
		} catch (error) {
			console.error('Error generating binder image:', error);
			alert('An error occurred while generating the image.');
		} finally {
			exporting = false;
		}
	}
</script>

<BinderHelp onClose={toggleHelp} open={showHelp} />

<div class="-mt-6 flex flex-col gap-4 p-4 md:p-6 lg:-mt-12">
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-3">
			<PageTitle title="Binder Builder" />
			<Button class="mt-1 p-1.5" onClick={toggleHelp} title="How the Binder Builder works">
				<HelpCircleIcon size={20} />
			</Button>
		</div>

		<div class="flex flex-wrap gap-2 text-xs">
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{pages.length} page{pages.length > 1 ? 's' : ''} of {slotsPerPage}</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{filledSlots}/{totalSlots} slots filled</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-gray-300">{binderStorage.cards.length - placedItems.size} left in storage</span>
			{#if exporting}<span class="rounded-full bg-gold-400 px-3 py-1 text-black">Rendering image...</span>{/if}
		</div>
	</div>

	<BinderToolbar
		bind:columns={columns}
		bind:rows={rows}
		bind:spread={spread}
		onAddSet={toggleSetModal}
		onAddUrl={toggleUrlModal}
		onExport={toggleExportModal}
		onMyCards={toggleMyCardsModal}
		onResetAll={resetAllPages}
	/>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-12">
		<div class="h-[calc(100dvh-19rem)] min-h-[26rem] lg:col-span-8">
			<BinderBoard
				columns={columns}
				currentPage={currentPage}
				{nextEmpty}
				onAddPage={addPage}
				onClearPages={clearPages}
				onDeletePages={deletePages}
				onDrop={handleDrop}
				onDuplicatePages={duplicatePages}
				onGoTo={index => (currentPage = index)}
				onRemove={removeCard}
				onSlotClick={handleSlotClick}
				pages={pages}
				rows={rows}
				spread={spread}
			/>
		</div>

		<div class="h-[calc(100dvh-19rem)] min-h-[26rem] lg:col-span-4">
			<BinderStorage
				bind:visibleItems={storageOrder}
				cards={cardsByCode}
				onAutoFill={autoFill}
				onClear={toggleClearStorageModal}
				onDropFromBinder={handleStorageDrop}
				onSelect={item => (selectedItem = item)}
				{placedItems}
				ready={catalogueReady}
				selected={selectedItem}
				{sets}
			/>
		</div>
	</div>
</div>

<Modal bind:open={showSetModal} onClose={toggleSetModal} title="Add complete set">
	<p class="mb-4 text-sm text-gray-300">Choose a set to send all of its cards to the storage.</p>

	<div class="mb-4">
		<Select
			bind:value={selectedSet}
			id="set-select"
			label="Choose a set:"
			options={data.sets
				.slice()
				.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
				.map(set => ({
					label: `${set.name} (${new Date(set.releaseDate).toLocaleDateString()}) - ${setCardCount(set)} cards`,
					value: set.name
				}))}
			placeholder="-- Select a set --"
		/>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleSetModal}>Cancel</Button>
		<button class="btn-gold text-sm" disabled={!selectedSet || !catalogueReady} onclick={addSetToStorage} type="button">{catalogueReady ? 'Add set' : 'Loading cards...'}</button>
	{/snippet}
</Modal>

<Modal bind:open={showMyCardsModal} onClose={toggleMyCardsModal} title="Add my cards">
	<p class="mb-4 text-sm text-gray-300">Choose which cards to send to the storage.</p>

	<div class="mb-4 flex flex-col gap-4">
		<Checkbox bind:checked={includeCollection} disabled={!loggedIn} id="include-collection" label="Include my collection" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if loggedIn}{data.collectionCodes.length} cards in your collection{:else}You need to be logged in to access your collection{/if}
		</p>

		<Checkbox bind:checked={includeWishlist} disabled={!loggedIn} id="include-wishlist" label="Include my wishlist" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if loggedIn}{data.wishlistCodes.length} cards in your wishlist{:else}You need to be logged in to access your wishlist{/if}
		</p>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleMyCardsModal}>Cancel</Button>
		<button
			class="btn-gold text-sm"
			disabled={!loggedIn || (!includeCollection && !includeWishlist)}
			onclick={addMyCardsToStorage}
			type="button"
		>
			Add to storage
		</button>
	{/snippet}
</Modal>

<Modal bind:open={showUrlModal} onClose={toggleUrlModal} title="Add card from URL">
	<p class="mb-4 text-sm text-gray-300">
		Paste image URLs to add them to the storage. URLs must start with 'http', and several can be separated by line breaks or semicolons.
	</p>
	<div class="mb-4">
		<TextInput bind:value={cardUrl} id="cardUrl" label="Single card image URL" placeholder="https://assets.tcgdex.net/..." type="url" />
	</div>
	<div class="mb-4">
		<TextArea
			bind:value={multipleCardUrls}
			class="max-h-80 overflow-y-auto"
			id="multipleCardUrls"
			label="Or multiple URLs (one per line)"
			placeholder={'https://example.com/card1.png\nhttps://example.com/card2.png'}
			rows={4}
		/>
	</div>
	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleUrlModal}>Cancel</Button>
		<button class="btn-gold text-sm" disabled={!cardUrl && !multipleCardUrls} onclick={addCardFromUrl} type="button">Add card(s)</button>
	{/snippet}
</Modal>

<Modal bind:open={showExportModal} onClose={toggleExportModal} title="Export as image">
	<p class="mb-4 text-sm text-gray-300">
		Pages render at 300px per card, numbered slot by slot so you can follow the sheet while filling the real binder.
	</p>
	{#if filledSlots < totalSlots}
		<p class="mb-4 rounded-sm bg-gray-900 p-2 text-xs text-gray-400">Some slots are still empty - they export as numbered placeholders.</p>
	{/if}

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleExportModal}>Cancel</Button>
		<Button class="px-4 py-2 text-sm" onClick={() => exportBinder('page')}>Current page</Button>
		<button class="btn-gold text-sm" onclick={() => exportBinder('all')} type="button">All {pages.length} pages</button>
	{/snippet}
</Modal>

<Modal bind:open={showClearStorageModal} onClose={toggleClearStorageModal} title="Clear Storage">
	<p class="mb-4 text-gray-300">Are you sure you want to remove all stored cards? This cannot be undone.</p>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleClearStorageModal}>Cancel</Button>
		<button class="btn-gold text-sm" onclick={clearAllStoredCards} type="button">Clear all cards</button>
	{/snippet}
</Modal>
