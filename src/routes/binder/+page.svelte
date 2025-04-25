<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { setContext } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import PageTitle from '@components/PageTitle.svelte';
	import Button from '$lib/components/filters/Button.svelte';
	import BinderGrid from './BinderGrid.svelte';
	import BinderStorage from './BinderStorage.svelte';
	import README from './README.svelte';
	import HelpCircleIcon from 'lucide-svelte/icons/help-circle';
	import LayersIcon from 'lucide-svelte/icons/layers';
	import XIcon from 'lucide-svelte/icons/x';
	
	// Page data from server
	export let data;
	
	// Binder configuration
	const rows = writable(3);
	const columns = writable(3);
	const binderCards = writable<Array<{id: string; url: string; position: number} | null>>([]);
	const storedCards = writable<Array<{id: string; url: string}>>([]);
	const showHelp = writable(false);
	const showSetModal = writable(false);
	const selectedSet = writable('');
	
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
			
			console.log('Données sauvegardées:', {
				binderCards: $binderCards.filter(c => c !== null).length,
				storedCards: $storedCards.length
			});
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
					console.log('Binder chargé:', data.cards.filter((c: any) => c !== null).length);
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
			$selectedSet = '';
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
</script>

<README showHelp={$showHelp} toggleHelp={toggleHelp} />

<div class="flex flex-col p-6 gap-6 min-h-[calc(100vh-64px)]">
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div class="flex items-center gap-3">
			<PageTitle title="Binder Builder" />
			<Button onClick={toggleHelp} class="p-1.5 mt-1">
				<HelpCircleIcon size={16} />
			</Button>
		</div>
		
		<div class="flex flex-wrap gap-3 items-center">
			<div class="flex gap-2 items-center">
				<label for="rows" class="text-gray-300 text-sm">Rows:</label>
				<input 
					id="rows"
					type="number" 
					bind:value={$rows} 
					min="2" 
					max="6" 
					class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
				/>
			</div>
			
			<div class="flex gap-2 items-center">
				<label for="columns" class="text-gray-300 text-sm">Columns:</label>
				<input 
					id="columns"
					type="number" 
					bind:value={$columns} 
					min="2" 
					max="6" 
					class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
				/>
			</div>
			
			<Button onClick={resetBinderGrid} class="text-sm">Reset Grid</Button>
			
			<Button onClick={toggleSetModal} class="text-sm flex items-center gap-1 px-3 py-2">
				<LayersIcon size={16} />
				<span>Add set</span>
			</Button>
		</div>
	</div>
	
	<!-- Binder Grid and Storage -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
		<div class="lg:col-span-9 h-full">
			<BinderGrid {binderCards} {storedCards} {rows} {columns} />
		</div>
		
		<div class="lg:col-span-3 h-full">
			<BinderStorage cards={storedCards} />
		</div>
	</div>
</div>

<!-- Set Selection Modal -->
{#if $showSetModal}
<div 
	class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
	transition:fade={{ duration: 200 }}
	on:click={toggleSetModal}
>
	<div 
		class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
		transition:fly={{ y: 20, duration: 200 }}
		on:click|stopPropagation
	>
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl text-gold-400 font-medium">Add complete set</h2>
			<button class="text-gray-400 hover:text-white" on:click={toggleSetModal}>
				<XIcon size={20} />
			</button>
		</div>
		
		<p class="text-gray-300 mb-4 text-sm">
			Choose a set to add all its cards to storage.
		</p>
		
		<div class="mb-4">
			<label for="setSelect" class="block text-gray-300 mb-2">Choose a set:</label>
			<select 
				id="setSelect"
				bind:value={$selectedSet}
				class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
			>
				<option value="">-- Select a set --</option>
				{#each data.sets.sort((a, b) => a.name.localeCompare(b.name)) as set}
					<option value={set.name}>{set.name} ({set.printedTotal} cards)</option>
				{/each}
			</select>
		</div>
		
		<div class="flex justify-end gap-3">
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
		</div>
	</div>
</div>
{/if}

<style>
	/* Custom scrollbar for modal */
	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background-color: #4a4a4a;
		border-radius: 20px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background-color: #FFB700;
	}
</style>	