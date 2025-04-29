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
	import type { PageData } from './$types';
	import TextInput from '@components/filters/TextInput.svelte';
	import TextArea from '@components/filters/TextArea.svelte';
	import Select from '@components/filters/Select.svelte';
	import NumberInput from '@components/filters/NumberInput.svelte';

	// Page data from server
	export let data: PageData;

	// Binder configuration
	const rows = writable(3);
	const columns = writable(3);
	const binderCards = writable<Array<{id: string; url: string; position: number} | null>>([]);
	const storedCards = writable<Array<{id: string; url: string}>>([]);
	const showHelp = writable(false);
	const showSetModal = writable(false);
	const selectedSet = writable('');
	const showUrlModal = writable(false);
	const cardUrl = writable('');
	const multipleCardUrls = writable('');

	// Rendre storedCards disponible via setContext pour SearchBar
	setContext('storedCards', storedCards);

	// Load and save functions
	function saveToLocalStorage() {
		if (!browser) return;

		try {
			// Sauvegarde du binder
			const binderData = {
				cards: $binderCards,
				rows: $rows,
				columns: $columns
			};
			window.localStorage.setItem('binderGridData', JSON.stringify(binderData));

			// Sauvegarde des cartes stockées
			window.localStorage.setItem('binderStoredCards', JSON.stringify($storedCards));
		} catch (e) {
			console.error('Erreur de sauvegarde:', e);
		}
	}

	function loadFromLocalStorage() {
		if (!browser) return;

		try {
			// Charger les cartes stockées
			const storedCardsString = window.localStorage.getItem('binderStoredCards');
			if (storedCardsString) {
				const parsed = JSON.parse(storedCardsString);
				if (Array.isArray(parsed)) {
					$storedCards = parsed;
					console.log('Cartes stockées chargées:', parsed.length);
				}
			}

			// Charger la configuration du binder
			const binderDataString = window.localStorage.getItem('binderGridData');
			if (binderDataString) {
				const data = JSON.parse(binderDataString);

				// Dimensions
				if (typeof data.rows === 'number' && typeof data.columns === 'number') {
					$rows = Math.max(2, data.rows);
					$columns = Math.max(2, data.columns);
				}

				// Cartes
				if (Array.isArray(data.cards)) {
					$binderCards = data.cards;
				}
			} else {
				resetBinderGrid();
			}
		} catch (e) {
			console.error('Erreur de chargement:', e);
			resetBinderGrid();
		}
	}

	// Appliquer les changements et sauvegarder
	function applyChanges() {
		saveToLocalStorage();
	}

	// Initialize on mount
	onMount(() => {
		loadFromLocalStorage();

		// Configuration des écouteurs d'événements
		binderCards.subscribe(() => {
			applyChanges();
		});

		storedCards.subscribe(() => {
			applyChanges();
		});

		rows.subscribe(() => {
			applyChanges();
		});

		columns.subscribe(() => {
			applyChanges();
		});

		// Écouter l'événement personnalisé pour ajouter une carte au stockage
		const handleAddToBinder = (event: CustomEvent) => {
			if (event.detail && event.detail.cardUrl) {
				$storedCards = [...$storedCards, {
					id: crypto.randomUUID(),
					url: event.detail.cardUrl
				}];
			}
		};

		document.addEventListener('add-to-binder', handleAddToBinder as EventListener);

		return () => {
			document.removeEventListener('add-to-binder', handleAddToBinder as EventListener);
		};
	});

	// Function to reset binder grid
	function resetBinderGrid() {
		// S'assurer que rows et columns sont au moins 2
		if ($rows < 2) $rows = 2;
		if ($columns < 2) $columns = 2;

		const totalCells = $rows * $columns;
		$binderCards = Array(totalCells).fill(null);
	}

	// Update grid when rows/columns change
	$: {
		const totalCells = $rows * $columns;
		if ($binderCards.length !== totalCells) {
			// Keep existing cards if possible
			const newGrid = Array(totalCells).fill(null);
			$binderCards.forEach((card, index) => {
				if (card && index < totalCells) {
					newGrid[index] = { ...card, position: index };
				}
			});
			$binderCards = newGrid;
		}
	}

	// Toggle help modal
	function toggleHelp() {
		$showHelp = !$showHelp;
	}

	// Toggle set modal
	function toggleSetModal() {
		$showSetModal = !$showSetModal;
		if (!$showSetModal) {
			$selectedSet = ''; // Reset on close
		}
	}

	// Toggle URL modal
	function toggleUrlModal() {
		$showUrlModal = !$showUrlModal;
		if (!$showUrlModal) {
			$cardUrl = ''; // Reset on close
			$multipleCardUrls = '';
		}
	}

	// Function to add all cards from a set
	function addSetToStorage() {
		if (!$selectedSet) return;

		const setToAdd = data.sets.find((set: any) => set.name === $selectedSet);
		if (!setToAdd) return;

		const cardsFromSet = data.allCards.filter((card: any) => {
			// Extract setCode from the card's cardCode (format: supertype_pokemonid_setcode_cardnumber)
			const parts = card.cardCode.split('_');
			const cardSetCode = parts[2];

			// Check if the card belongs to the selected set by comparing with set aliases or the code from the logo URL
			const setCode = setToAdd.logo.split('/').at(-2);
			return setToAdd.aliases?.includes(cardSetCode) || setCode === cardSetCode;
		});

		// Add all cards from the set to storage
		const newCards = cardsFromSet.map((card: any) => ({
			id: crypto.randomUUID(),
			url: card.image
		}));

		$storedCards = [...$storedCards, ...newCards];

		// Close the modal
		toggleSetModal();
	}

	// Function to add a card from a URL
	function addCardFromUrl() {
		if (!$cardUrl && !$multipleCardUrls) return;

		const newCards = [];

		// Add single URL if provided
		if ($cardUrl) {
			newCards.push({
				id: crypto.randomUUID(),
				url: $cardUrl
			});
		}

		// Process multiple URLs if provided
		if ($multipleCardUrls) {
			// Split by newlines and process each line
			const lines = $multipleCardUrls.split('\n');

			for (const line of lines) {
				// Remove semicolons or periods from the end of the URL
				const trimmedLine = line.trim();
				if (trimmedLine) {
					const url = trimmedLine.replace(/[;.]$/, '').trim();
					if (url) {
						newCards.push({
							id: crypto.randomUUID(),
							url: url
						});
					}
				}
			}
		}

		// Add all new cards to storage
		if (newCards.length > 0) {
			$storedCards = [...$storedCards, ...newCards];
		}

		// Close the modal
		toggleUrlModal();
	}
</script>

<README showHelp={$showHelp} toggleHelp={toggleHelp} />

<div class="flex flex-col p-6 gap-6">
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div class="flex items-center gap-3">
			<PageTitle title="Binder Builder" />
			<Button onClick={toggleHelp} class="p-1.5 mt-1">
				<HelpCircleIcon size={16} />
			</Button>
		</div>

		<div class="flex flex-wrap gap-3 items-end">
			<div class="flex gap-2 items-center">
				<NumberInput
					id="rows"
					bind:value={$rows}
					min={2}
					max={6}
					label="Rows:"
				/>
			</div>

			<div class="flex gap-2 items-center">
				<NumberInput
					id="columns"
					bind:value={$columns}
					min={2}
					max={6}
					label="Columns:"
				/>
			</div>

			<Button onClick={resetBinderGrid} class="text-sm">Reset Grid</Button>

			<Button onClick={toggleSetModal} class="text-sm flex items-center gap-1 px-3 py-2">
				<LayersIcon size={16} />
				<span>Add set</span>
			</Button>

			<Button onClick={toggleUrlModal} class="text-sm flex items-center gap-1 px-3 py-2">
				<LinkIcon size={16} />
				<span>Add from URL</span>
			</Button>
		</div>
	</div>

	<!-- Binder Grid and Storage -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
		<div class="lg:col-span-9">
			<div class="bg-gray-800 rounded-lg h-[calc(100vh-250px)] min-h-[450px] flex items-stretch">
				<BinderGrid {binderCards} {storedCards} {rows} {columns} />
			</div>
		</div>

		<div class="lg:col-span-3">
			<div class="h-[calc(100vh-250px)] min-h-[450px]">
				<BinderStorage cards={storedCards} />
			</div>
		</div>
	</div>
</div>

<!-- Set Selection Modal -->
<Modal bind:open={$showSetModal} on:close={toggleSetModal} title="Add complete set">
	<p class="text-gray-300 mb-4 text-sm">
		Choose a set to add all its cards to storage.
	</p>

	<div class="mb-4">
		<label for="setSelect" class="block text-gray-300 mb-2">Choose a set:</label>
		<Select
			id="set-select"
			bind:value={$selectedSet}
			label="Choose a set:"
			placeholder="-- Select a set --"
			options={data.sets.sort((a, b) => a.name.localeCompare(b.name)).map(set => ({
				value: set.name,
				label: `${set.name} (${set.printedTotal} cards)`
			}))}
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

<!-- URL Card Modal -->
<Modal bind:open={$showUrlModal} on:close={toggleUrlModal} title="Add card from URL">
	<p class="text-gray-300 mb-4 text-sm">
		Paste the URL of a Pokémon card image to add it to your storage.
	</p>

	<div class="mb-4">
		<label for="cardUrl" class="block text-gray-300 mb-2">Card image URL:</label>
		<TextInput
			id="cardUrl"
			label="Card image URL"
			bind:value={$cardUrl}
			type="url"
			placeholder="https://example.com/card-image.jpg"
		/>
	</div>

	<div class="mb-4">
		<label for="multipleCardUrls" class="block text-gray-300 mb-2">Or multiple URLs (one per line ending with ; or .):</label>
		<TextArea
			id="multipleCardUrls"
			bind:value={$multipleCardUrls}
			placeholder="https://example.com/card1.jpg;
https://example.com/card2.jpg;
https://example.com/card3.jpg."
			rows={4}
			label="Or multiple URLs (one per line ending with ; or .):"
			class="max-h-[20rem] overflow-y-auto"
		/>
	</div>

	<svelte:fragment slot="footer">
		<Button
			onClick={toggleUrlModal}
			class="text-sm px-4 py-2 border border-gray-600"
		>
			Cancel
		</Button>
		<Button
			onClick={addCardFromUrl}
			class="text-sm px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50"
			disabled={!$cardUrl && !$multipleCardUrls}
		>
			Add card
		</Button>
	</svelte:fragment>
</Modal>
