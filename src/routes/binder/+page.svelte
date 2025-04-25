<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { setContext } from 'svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import Button from '$lib/components/filters/Button.svelte';
	import BinderGrid from './BinderGrid.svelte';
	import BinderStorage from './BinderStorage.svelte';
	import README from './README.svelte';
	import DownloadIcon from 'lucide-svelte/icons/download';
	import UploadIcon from 'lucide-svelte/icons/upload';
	import HelpCircleIcon from 'lucide-svelte/icons/help-circle';
	
	// Binder configuration
	const rows = writable(3);
	const columns = writable(3);
	const binderCards = writable<Array<{id: string; url: string; position: number} | null>>([]);
	const storedCards = writable<Array<{id: string; url: string}>>([]);
	const cardUrl = writable('');
	const showHelp = writable(false);
	
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
	
	// Function to store a card from URL
	function storeCard() {
		if ($cardUrl.trim()) {
			$storedCards = [...$storedCards, {
				id: crypto.randomUUID(),
				url: $cardUrl.trim()
			}];
			$cardUrl = '';
		}
	}
	
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
	
	// Export binder data
	function exportBinderData() {
		const data = {
			grid: {
				rows: $rows,
				columns: $columns,
				cards: $binderCards
			},
			storage: $storedCards
		};
		
		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		
		const a = document.createElement('a');
		a.href = url;
		a.download = 'pokebinder-export.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	
	// Import binder data
	function importBinderData(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;
		
		const file = input.files[0];
		const reader = new FileReader();
		
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target?.result as string);
				if (data.grid && data.storage) {
					$rows = Math.max(2, data.grid.rows);
					$columns = Math.max(2, data.grid.columns);
					$binderCards = data.grid.cards;
					$storedCards = data.storage;
				}
			} catch (error) {
				console.error('Error importing data:', error);
				alert('Invalid file format');
			}
		};
		
		reader.readAsText(file);
		input.value = ''; // Reset input
	}
	
	// Toggle help modal
	function toggleHelp() {
		$showHelp = !$showHelp;
	}
	
	// Fonction vide pour le bouton d'upload (pour le linter)
	function handleUpload() {}
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
			
			<Button onClick={resetBinderGrid} class="px-3">Reset Grid</Button>
			
			<div class="flex gap-2">
				<Button onClick={exportBinderData} class="p-2">
					<DownloadIcon size={16} />
				</Button>
				
				<label class="cursor-pointer">
					<Button class="p-2" onClick={handleUpload}>
						<UploadIcon size={16} />
					</Button>
					<input 
						type="file" 
						accept=".json" 
						on:change={importBinderData} 
						class="hidden"
					/>
				</label>
			</div>
		</div>
	</div>
	
	<div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
		<BinderGrid {binderCards} {storedCards} {rows} {columns} />
		
		<div class="flex flex-col gap-4">
			<BinderStorage cards={storedCards} />
		</div>
	</div>
</div>	