<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { setContext } from 'svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import Button from '@components/filters/Button.svelte';
	import BinderGrid from '@components/binder/BinderGrid.svelte';
	import BinderStorage from '@components/binder/BinderStorage.svelte';
	import README from '@components/binder/README.svelte';
	import Modal from '@components/ui/Modal.svelte';
	import HelpCircleIcon from 'lucide-svelte/icons/help-circle';
	import LayersIcon from 'lucide-svelte/icons/layers';
	import LinkIcon from 'lucide-svelte/icons/link';
	import DownloadIcon from 'lucide-svelte/icons/download';
	import BookUserIcon from 'lucide-svelte/icons/book-user';
	import type { PageData } from './$types';
	import Select from '@components/filters/Select.svelte';
	import NumberInput from '@components/filters/NumberInput.svelte';
	import Checkbox from '$lib/components/filters/Checkbox.svelte';
	import type { BinderCards, FullCard } from '$lib/types';
	import TextInput from '@components/filters/TextInput.svelte';
	import TextArea from '@components/filters/TextArea.svelte';
	import RotateCwIcon from 'lucide-svelte/icons/rotate-cw';

	// Page data from server
	export let data: PageData;

	$: sets = data.sets;

	// Binder configuration
	const rows = writable(3);
	const columns = writable(3);
	const binderCards = writable<Array<BinderCards | null>>([]);
	const storedCards = writable<string[]>([]);
	const showHelp = writable(false);
	const showSetModal = writable(false);
	const selectedSet = writable('');
	const showUrlModal = writable(false);
	const showEmptySlotsModal = writable(false);
	const showClearStorageModal = writable(false);
	const cardUrl = writable('');
	const multipleCardUrls = writable('');

	// My Cards modal
	const showMyCardsModal = writable(false);
	const includeCollection = writable(true);
	const includeWishlist = writable(true);

	// Rendre storedCards disponible via setContext pour SearchBar
	setContext('storedCards', storedCards);

	// Load and save functions
	function saveToLocalStorage() {
		if (!browser) return;
		try {
			const binderData = { cards: $binderCards, rows: $rows, columns: $columns };
			window.localStorage.setItem('binderGridData', JSON.stringify(binderData));
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
						console.warn('Migrating old storedCards format...');
						const migratedCardCodes: string[] = [];
						for (const oldCard of parsed) {
							if (typeof oldCard.url === 'string') {
								const foundCard = data.allCards.find(c => c.image === oldCard.url);
								if (foundCard) {
									migratedCardCodes.push(foundCard.cardCode);
								} else {
									console.warn(`Could not find cardCode for old stored URL: ${oldCard.url}`);
								}
							}
						}
						$storedCards = [...new Set(migratedCardCodes)];
						console.log('Migration complete, loaded cardCodes:', $storedCards.length);
						saveToLocalStorage();
					} else if (parsed.every(item => typeof item === 'string')) {
						$storedCards = parsed;
						console.log('CardCodes stockés chargées:', parsed.length);
					} else {
						console.warn('Invalid format found in binderStoredCards, resetting.');
						$storedCards = [];
					}
				}
			}

			const binderDataString = window.localStorage.getItem('binderGridData');
			if (binderDataString) {
				const binderData = JSON.parse(binderDataString);
				if (typeof binderData.rows === 'number' && typeof binderData.columns === 'number') {
					$rows = Math.max(2, binderData.rows);
					$columns = Math.max(2, binderData.columns);
				}
				if (Array.isArray(binderData.cards)) { $binderCards = binderData.cards; }
			} else { resetBinderGrid(); }
		} catch (e) {
			console.error('Erreur de chargement:', e);
			resetBinderGrid();
			$storedCards = [];
		}
	}

	function applyChanges() { saveToLocalStorage(); }

	onMount(() => {
		loadFromLocalStorage();
		binderCards.subscribe(applyChanges);
		storedCards.subscribe(applyChanges);
		rows.subscribe(applyChanges);
		columns.subscribe(applyChanges);

		const handleAddToBinder = (event: CustomEvent) => {
			const codeToAdd: string | undefined = event.detail?.cardCode;

			if (codeToAdd && !$storedCards.includes(codeToAdd)) {
				$storedCards = [...$storedCards, codeToAdd];
			} else if (!codeToAdd) {
				 console.warn('add-to-binder event triggered without cardCode in detail.');
			}
		};
		document.addEventListener('add-to-binder', handleAddToBinder as EventListener);
		return () => { document.removeEventListener('add-to-binder', handleAddToBinder as EventListener); };
	});

	function resetBinderGrid() {
		if ($rows < 2) $rows = 2;
		if ($columns < 2) $columns = 2;
		const totalCells = $rows * $columns;
		$binderCards = Array(totalCells).fill(null);
	}

	$: {
		const totalCells = $rows * $columns;
		if ($binderCards.length !== totalCells) {
			const newGrid = Array(totalCells).fill(null);
			$binderCards.forEach((card, index) => {
				if (card && index < totalCells) { newGrid[index] = { ...card, position: index }; }
			});
			$binderCards = newGrid;
		}
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
	function toggleMyCardsModal() {
		$showMyCardsModal = !$showMyCardsModal;
	}

	function toggleClearStorageModal() {
		$showClearStorageModal = !$showClearStorageModal;
	}

	function clearAllStoredCards() {
		$storedCards = [];
		toggleClearStorageModal();
	}

	function addSetToStorage() {
		if (!$selectedSet) return;

		// Filter allCards directly by setName matching the selected set name
		const cardCodesFromSet = data.allCards
			.filter((card: FullCard) => card.setName === $selectedSet)
			.map((card: FullCard) => card.cardCode);

		// Ensure the codes from the set are unique first
		const uniqueCodesFromSet = [...new Set(cardCodesFromSet)];

		// Add only those unique codes that are not already in storage
		const currentStoredCodes = new Set($storedCards);
		const newCardCodesToAdd = uniqueCodesFromSet.filter(code => !currentStoredCodes.has(code));
		if (newCardCodesToAdd.length > 0) {
			$storedCards = [...$storedCards, ...newCardCodesToAdd];
		}

		toggleSetModal();
	}

	function addMyCardsToStorage() {
		if (!$includeCollection && !$includeWishlist) return;

		const currentStoredCodes = new Set($storedCards);
		const newCardCodesToAdd: string[] = [];

		// Add cards from collection if selected
		if ($includeCollection && data.serverCollectionCards) {
			data.serverCollectionCards.forEach((card: FullCard) => {
				if (!currentStoredCodes.has(card.cardCode) && !newCardCodesToAdd.includes(card.cardCode)) {
					newCardCodesToAdd.push(card.cardCode);
				}
			});
		}

		// Add cards from wishlist if selected
		if ($includeWishlist && data.serverWishlistCards) {
			data.serverWishlistCards.forEach((card: FullCard) => {
				if (!currentStoredCodes.has(card.cardCode) && !newCardCodesToAdd.includes(card.cardCode)) {
					newCardCodesToAdd.push(card.cardCode);
				}
			});
		}

		if (newCardCodesToAdd.length > 0) {
			$storedCards = [...$storedCards, ...newCardCodesToAdd];
		}

		toggleMyCardsModal();
	}

	function addCardFromUrl() {
		if (!$cardUrl && !$multipleCardUrls) return;
		const urlsToAdd: string[] = [];
		const currentStored = new Set($storedCards); // Use Set for efficient checking

		// Helper to validate and add URL
		const validateAndAdd = (url: string) => {
			const trimmedUrl = url.trim();
			if (trimmedUrl.startsWith('http') && !currentStored.has(trimmedUrl) && !urlsToAdd.includes(trimmedUrl)) {
				urlsToAdd.push(trimmedUrl);
			} else if (!trimmedUrl.startsWith('http')) {
				console.warn(`Invalid URL format (must start with http): ${trimmedUrl}`);
			}
		};

		if ($cardUrl) {
			validateAndAdd($cardUrl);
		}

		if ($multipleCardUrls) {
			// First split by newlines
			const lines = $multipleCardUrls.split(/\n/);
			for (let line of lines) {
				line = line.trim();
				if (!line) continue;

				// Then split each line by semicolons in case multiple URLs are on one line
				const urlsInLine = line.split(';');
				for (let url of urlsInLine) {
					url = url.trim();
					// Remove trailing period if present
					url = url.replace(/\.$/, '');
					if (url && url.startsWith('http')) {
						validateAndAdd(url);
					}
				}
			}
		}

		if (urlsToAdd.length > 0) $storedCards = [...$storedCards, ...urlsToAdd];
		toggleUrlModal();
	}

	async function generateBinderImage() {
		if (!browser) return;
		const hasEmptySlots = $binderCards.some(card => card === null);
		if (hasEmptySlots) { $showEmptySlotsModal = true; return; }
		generateBinderImageProcess();
	}

	async function generateBinderImageProcess() {
		const cardWidth = 150, cardHeight = 210, padding = 10;
		const canvasWidth = $columns * (cardWidth + padding) + padding;
		const canvasHeight = $rows * (cardHeight + padding) + padding;
		const canvas = document.createElement('canvas');
		canvas.width = canvasWidth; canvas.height = canvasHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) { console.error('Could not get canvas context'); alert('Could not generate image: Canvas context unavailable.'); return; }

		ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		const imageLoadPromises = $binderCards.map((binderSlot, index) => {
			if (!binderSlot || !binderSlot.url) return Promise.resolve();
			return new Promise<void>((resolve) => {
				const img = new Image(); img.crossOrigin = 'Anonymous';
				img.onload = () => {
					const col = index % $columns, row = Math.floor(index / $columns);
					const x = padding + col * (cardWidth + padding), y = padding + row * (cardHeight + padding);
					ctx.drawImage(img, x, y, cardWidth, cardHeight); resolve();
				};
				img.onerror = (error) => {
					console.error(`Error loading image ${binderSlot.url}:`, error);
					const col = index % $columns, row = Math.floor(index / $columns);
					const x = padding + col * (cardWidth + padding), y = padding + row * (cardHeight + padding);
					ctx.fillStyle = '#4b5563'; ctx.fillRect(x, y, cardWidth, cardHeight);
					ctx.fillStyle = '#d1d5db'; ctx.textAlign = 'center';
					ctx.fillText('Error', x + cardWidth / 2, y + cardHeight / 2); resolve();
				};
				// Use the proxy endpoint to avoid CORS issues
				img.src = `/api/image-proxy?url=${encodeURIComponent(binderSlot.url)}`;
			});
		});

		try {
			await Promise.all(imageLoadPromises);
			const dataUrl = canvas.toDataURL('image/png');
			const link = document.createElement('a');
			link.href = dataUrl;
			link.download = 'pokecards-collector-binder.png';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) { console.error('Error generating binder image:', error); alert('An error occurred while generating the image.'); }
	}
</script>

<README showHelp={$showHelp} toggleHelp={toggleHelp} />

<div class="flex flex-col p-6 gap-6">
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div class="flex items-center gap-3">
			<PageTitle title="Binder Builder" />
			<Button onClick={toggleHelp} class="p-1.5 mt-1">
				<HelpCircleIcon size={20} />
			</Button>
		</div>

		<div class="flex flex-wrap gap-3 items-end">
			<div class="flex gap-2 items-center">
				<NumberInput
					id="rows"
					bind:value={$rows}
					min={2}
					max={8}
					label="Rows:"
				/>
			</div>

			<div class="flex gap-2 items-center">
				<NumberInput
					id="columns"
					bind:value={$columns}
					min={2}
					max={8}
					label="Columns:"
				/>
			</div>

			<Button onClick={resetBinderGrid} class="text-sm">
				<RotateCwIcon size={16} />
				Reset Grid
			</Button>

			<Button onClick={toggleSetModal} class="text-sm flex items-center gap-1 px-3 py-2">
				<LayersIcon size={16} />
				<span>Add set</span>
			</Button>

			<Button onClick={toggleMyCardsModal} class="text-sm flex items-center gap-1 px-3 py-2">
				<BookUserIcon size={16} />
				<span>My Cards</span>
			</Button>

			<Button onClick={toggleUrlModal} class="text-sm flex items-center gap-1 px-3 py-2"><LinkIcon size={16} /> <span>Add from URL</span></Button>

			<Button onClick={generateBinderImage} class="text-sm flex items-center gap-1 px-3 py-2">
				<DownloadIcon size={16} />
				<span>Export as Image</span>
			</Button>
		</div>
	</div>

	<!-- Binder Grid and Storage -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
		<div class="lg:col-span-9">
			<div class="bg-gray-800 rounded-lg h-[calc(100vh-250px)] min-h-[450px] flex items-stretch">
				<BinderGrid {binderCards} {rows} {columns} />
			</div>
		</div>

		<div class="lg:col-span-3">
			<div class="h-[calc(100vh-250px)] min-h-[450px]">
				<BinderStorage cards={storedCards} allCards={data.allCards} {sets} {toggleClearStorageModal} />
			</div>
		</div>
	</div>
</div>

<!-- Set Selection Modal -->
<Modal bind:open={$showSetModal} onClose={toggleSetModal} title="Add complete set">
	<p class="text-gray-300 mb-4 text-sm">
		Choose a set to add all its cards (cardCodes) to storage.
	</p>

	<div class="mb-4">
		<label for="set-select" class="block text-gray-300 mb-2">Choose a set:</label>
		<Select
			id="set-select"
			bind:value={$selectedSet}
			label="Choose a set:"
			placeholder="-- Select a set --"
			options={data.sets
				.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()) // Sort by date timestamp
				.map(set => ({
					value: set.name,
					label: `${set.name} (${new Date(set.releaseDate).toLocaleDateString()}) - ${set.printedTotal} cards`
				}))
			}
		/>
	</div>

	<svelte:fragment slot="footer">
		<Button
			onClick={toggleSetModal}
			class="text-sm px-4 py-2 border border-gray-600"
		>
			Cancel
		</Button>
		<Button
			onClick={addSetToStorage}
			class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50"
			disabled={!$selectedSet}
		>
			Add set
		</Button>
	</svelte:fragment>
</Modal>

<!-- My Cards Modal -->
<Modal bind:open={$showMyCardsModal} onClose={toggleMyCardsModal} title="Add my cards">
	<p class="text-gray-300 mb-4 text-sm">
		Choose which cards to add to your binder.
	</p>

	<div class="mb-4 flex flex-col gap-4">
		<Checkbox
			id="include-collection"
			label="Include my collection"
			bind:checked={$includeCollection}
			disabled={!data.serverCollectionCards}
		/>
		{#if data.serverCollectionCards}
			<p class="text-gray-400 text-xs ml-6">
				{data.serverCollectionCards.length} cards in your collection
			</p>
		{:else}
			<p class="text-gray-400 text-xs ml-6">
				You need to be logged in to access your collection
			</p>
		{/if}

		<Checkbox
			id="include-wishlist"
			label="Include my wishlist"
			bind:checked={$includeWishlist}
			disabled={!data.serverWishlistCards}
		/>
		{#if data.serverWishlistCards}
			<p class="text-gray-400 text-xs ml-6">
				{data.serverWishlistCards.length} cards in your wishlist
			</p>
		{:else}
			<p class="text-gray-400 text-xs ml-6">
				You need to be logged in to access your wishlist
			</p>
		{/if}
	</div>

	<svelte:fragment slot="footer">
		<Button
			onClick={toggleMyCardsModal}
			class="text-sm px-4 py-2 border border-gray-600"
		>
			Cancel
		</Button>
		<Button
			onClick={addMyCardsToStorage}
			class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50"
			disabled={(!$includeCollection || !data.serverCollectionCards) && (!$includeWishlist || !data.serverWishlistCards)}
		>
			Add to binder
		</Button>
	</svelte:fragment>
</Modal>

<!-- URL Card Modal -->
<Modal bind:open={$showUrlModal} onClose={toggleUrlModal} title="Add card from URL">
	<p class="text-gray-300 mb-4 text-sm">
		Paste image URLs to add them to storage. URLs must start with 'http'. You can paste multiple URLs separated by line breaks or semicolons.
	</p>
	<div class="mb-4">
		<label for="cardUrl" class="block text-gray-300 mb-2">Single card image URL:</label>
		<TextInput id="cardUrl" label="Single card image URL" bind:value={$cardUrl} type="url" placeholder="https://images.pokemontcg.io/..." />
	</div>
	<div class="mb-4">
		<label for="multipleCardUrls" class="block text-gray-300 mb-2">Or multiple URLs (one per line):</label>
		<TextArea
			bind:value={$multipleCardUrls}
			class="max-h-[20rem] overflow-y-auto"
			id="multipleCardUrls"
			label="Or multiple URLs (one per line)"
			placeholder="https://images.pokemontcg.io/card1.png
https://images.pokemontcg.io/card2.png
https://images.pokemontcg.io/card3.png

You can also separate URLs with semicolons:
https://images.pokemontcg.io/card4.png; https://images.pokemontcg.io/card5.png"
			rows={4}
		/>
	</div>
	<svelte:fragment slot="footer">
		<Button onClick={toggleUrlModal} class="text-sm px-4 py-2 border border-gray-600">Cancel</Button>
		<Button onClick={addCardFromUrl} class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50" disabled={!$cardUrl && !$multipleCardUrls}> Add card(s) </Button>
	</svelte:fragment>
</Modal>

<!-- Empty Slots Confirmation Modal -->
<Modal bind:open={$showEmptySlotsModal} title="Incomplete Binder" onClose={() => $showEmptySlotsModal = false}>
	<p class="text-gray-300 mb-4">
		Your binder has empty slots. Do you still want to export it as an image?
	</p>

	<svelte:fragment slot="footer">
		<Button
			onClick={() => $showEmptySlotsModal = false}
			class="text-sm px-4 py-2 border border-gray-600"
		>
			Cancel
		</Button>
		<Button
			onClick={() => {
				$showEmptySlotsModal = false;
				generateBinderImageProcess();
			}}
			class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black"
		>
			Export Anyway
		</Button>
	</svelte:fragment>
</Modal>

<!-- Clear Storage Confirmation Modal -->
<Modal bind:open={$showClearStorageModal} onClose={toggleClearStorageModal} title="Clear Storage">
	<p class="text-gray-300 mb-4">
		Are you sure you want to remove all stored cards? This cannot be undone.
	</p>

	<svelte:fragment slot="footer">
		<Button
			onClick={toggleClearStorageModal}
			class="text-sm px-4 py-2 border border-gray-600"
		>
			Cancel
		</Button>
		<Button
			onClick={clearAllStoredCards}
			class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black"
		>
			Clear All Cards
		</Button>
	</svelte:fragment>
</Modal>
