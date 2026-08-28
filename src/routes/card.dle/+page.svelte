<script lang="ts">
	import type { PageData } from './$types';
	import type { CardDleFeedback, CardDleGuessResponse } from '$lib/types';
	import { readJson } from '$helpers/http';
	import Modal from '@components/ui/Modal.svelte';
	import CardImage from '@components/card/CardImage.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import Button from '@components/filters/Button.svelte';
	import BouncyLoader from '@components/BouncyLoader.svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsDownIcon from '@lucide/svelte/icons/chevrons-down';
	import ChevronsUpIcon from '@lucide/svelte/icons/chevrons-up';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PartyPopperIcon from '@lucide/svelte/icons/party-popper';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TargetIcon from '@lucide/svelte/icons/target';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	type CardSuggestion = PageData['cardSuggestions'][number];

	interface PendingGuess {
		cardImage: string;
		id: number;
		name: string;
		pokemonNumber?: number;
	}

	interface HistoricGuess extends PendingGuess {
		feedback: CardDleFeedback;
		isCorrect: boolean;
	}

	let searchInput = $state('');
	let activeSuggestions = $state<CardSuggestion[]>([]);
	let historicGuesses = $state<HistoricGuess[]>([]);
	let loadingGuess = $state<PendingGuess | null>(null);
	let showRulesModal = $state(false);
	let hasWon = $state(false);
	let isSubmitting = $state(false);

	function displayMatchingCards(searchTerm?: string) {
		const term = searchTerm || searchInput.trim();
		if (term.length > 0) {
			const searchTermLower = term.toLowerCase();
			const filteredCards = (data.cardSuggestions || []).filter(card =>
				card.pokemonName.toLowerCase().includes(searchTermLower) ||
				card.name.toLowerCase().includes(searchTermLower)
			);

			// Remove duplicates by cardCode
			const seenCardCodes = new Set();
			activeSuggestions = filteredCards.filter(card => {
				if (seenCardCodes.has(card.cardCode)) return false;
				seenCardCodes.add(card.cardCode);
				return true;
			}).slice(0, 100);
		} else {
			activeSuggestions = [];
		}
	}

	function handleDebouncedSearch(value: string) {
		displayMatchingCards(value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			displayMatchingCards();
		}
	}

	async function selectSuggestion(card: CardSuggestion) {
		if (isSubmitting) return;

		isSubmitting = true;

		loadingGuess = {
			id: new Date().getTime(),
			name: card.name,
			cardImage: card.image,
			pokemonNumber: card.pokemonNumber
		};

		// Don't scroll immediately - wait for the guess to be processed

		try {
			const formData = new FormData();
			formData.append('guessedCardId', card.cardCode);

			const response = await fetch('/api/card-dle/guess', {
				method: 'POST',
				body: formData
			});

			const result = await readJson<CardDleGuessResponse>(response, { error: 'Invalid server response' });

			if (result.success) {
				const newGuess = {
					id: new Date().getTime(),
					name: result.guessedCardName,
					cardImage: result.guessedCardImage,
					pokemonNumber: result.guessedPokemonNumber,
					feedback: result.feedback,
					isCorrect: result.isCorrectGuess
				};

				historicGuesses = [...historicGuesses, newGuess];

				if (result.isCorrectGuess) {
					activeSuggestions = [];
					hasWon = true;
				}

				loadingGuess = null;
				isSubmitting = false;

				// Scroll to the guess that was just appended at the end of the list
				setTimeout(() => {
					const latestGuess = document.querySelector('.historic-guess-item:last-child');
					if (latestGuess) {
						latestGuess.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}, 100);
			} else {
				console.error("API error:", result.error);
				loadingGuess = null;
				isSubmitting = false;
			}
		} catch (error) {
			console.error("Network error:", error);
			loadingGuess = null;
			isSubmitting = false;
		}
	}

	function getFeedbackBgClass(correct: boolean | undefined): string {
		if (correct === undefined) return 'bg-gray-800 text-gray-300';
		return correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
	}

	function getPriceComparisonText(comparison: string | undefined): string {
		if (comparison === 'higher') return 'Mystery card is higher';
		if (comparison === 'lower') return 'Mystery card is lower';
		return '';
	}

	function getPriceComparisonHint(comparison: string | undefined): string {
		if (comparison === 'correct') return 'Same price as the mystery card';
		if (comparison === 'higher') return 'The mystery card costs more than this one';
		if (comparison === 'lower') return 'The mystery card costs less than this one';
		return 'Price of this guess';
	}

	const rulesSteps = [
		{ detail: 'Type a Pokémon name to list the cards you can guess.', title: 'Search' },
		{ detail: 'Pick one card from the results, it becomes your guess.', title: 'Select' },
		{ detail: 'Compare the six coloured cells and guess again.', title: 'Read the row' }
	];

	const rulesAttributes = [
		{ detail: 'Character printed on the card', icon: PawPrintIcon, name: 'Pokémon' },
		{ detail: 'Illustrator credited on the card', icon: PaintbrushIcon, name: 'Artist' },
		{ detail: 'Set the card was printed in', icon: LibraryIcon, name: 'Set' },
		{ detail: 'Pokémon, Trainer or Energy', icon: LayersIcon, name: 'Supertype' },
		{ detail: 'Element: Fire, Water, Psychic...', icon: SparklesIcon, name: 'Type' },
		{ detail: 'Cardmarket value, in euros', icon: CircleEuroIcon, name: 'Price' }
	];

	const rulesNotes = [
		'Trainer and Energy cards show "None" as their type.',
		'Only cards worth 3 € or more can be the mystery card.',
		'A new mystery card is drawn every day.'
	];

	const rulesTips = [
		'Open with a popular Pokémon, Pikachu or Charizard cover a lot of sets.',
		'Follow the price arrows to jump between cheap and expensive prints.',
		'A green set means the answer is another card from that same set.'
	];

	function getFeedbackHint(attribute: string, correct: boolean | undefined): string {
		if (correct === undefined) return attribute;
		return correct ? `${attribute} matches the mystery card` : `Wrong ${attribute.toLowerCase()}`;
	}
</script>

<div class="container mx-auto p-4 text-white">
	<!-- Hero Section -->
	<div class="text-center mb-8">
		<h1 class="text-5xl font-bold mb-4 bg-linear-to-r from-gold-400 via-yellow-400 to-gold-400 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-x">
			Card.dle
		</h1>
		<p class="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
			The daily Pokémon TCG guessing game! Can you identify today's mystery card?
		</p>

		<!-- Game Introduction -->
		<div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8 max-w-3xl mx-auto shadow-lg">
			<div class="flex items-center justify-center gap-3 mb-4">
				<Gamepad2Icon class="text-gold-400" size={28} />
				<h2 class="text-2xl font-bold text-gold-400">How to Play</h2>
			</div>

			<div class="text-center space-y-4 flex flex-col items-center">
				<p class="flex items-center justify-center gap-2 text-gray-300 text-lg">
					<TargetIcon class="text-gold-400 shrink-0" size={20} /> Guess the daily Pokémon card by comparing attributes!
				</p>

				<div class="flex items-center justify-center gap-6 text-sm">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-600 rounded-sm"></div>
						<span class="text-green-400">Correct</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-600 rounded-sm"></div>
						<span class="text-red-400">Wrong</span>
					</div>
					<div class="flex items-center gap-2" title="An arrow tells you whether the mystery card costs more or less than your guess">
						<ChevronsUpIcon class="text-gold-400" size={16} />
						<ChevronsDownIcon class="text-gold-400" size={16} />
						<span class="text-gold-400">Price hints</span>
					</div>
				</div>

				<div class="text-center">
					<Button
						onClick={() => showRulesModal = true}
						class="px-4 py-2"
						title="Read the full rules of Card.dle"
					>
						<ScrollTextIcon size={16} /> View Detailed Rules
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Historic Guesses Display -->
	<div class="mt-8 w-full overflow-x-auto">
		{#if historicGuesses.length > 0 || loadingGuess}
			<!-- Global Header for Grid -->
			<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(5,minmax(80px,1fr))] gap-px font-semibold text-center mb-1 bg-gray-900 text-gold-400 p-1 rounded-t-md text-sm sticky top-0 z-10">
				<div class="p-2" title="The card you guessed">Card</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Pokémon on the card"><PawPrintIcon size={14} /> Pokémon</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Illustrator of the card"><PaintbrushIcon size={14} /> Artist</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Set the card was printed in"><LibraryIcon size={14} /> Set</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Pokémon, Trainer or Energy"><LayersIcon size={14} /> Supertype</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Energy types on the card"><SparklesIcon size={14} /> Type(s)</div>
				<div class="flex items-center justify-center gap-1 p-2" title="Cardmarket value of the card"><CircleEuroIcon size={14} /> Price</div>
			</div>

			{#each historicGuesses as guess, i (guess.id)}
				<div class="historic-guess-item mb-2 scroll-mt-80">
					<h3 class="font-bold text-lg my-2 text-center text-gold-400">Guess {i + 1} - {guess.name}</h3>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(5,minmax(80px,1fr))] gap-px bg-gray-700 border border-gray-600 rounded-b-md overflow-hidden text-sm items-stretch [&>div]:min-h-[50px]">
						<!-- Card Image Cell -->
						<div class="h-52 p-1 bg-gray-900 flex items-center justify-center aspect-[0.717]">
							<CardImage
								imageUrl={guess.cardImage}
								alt="Card: {guess.name}"
								class="max-w-full max-h-full object-contain rounded-sm"
								lazy={true}
							/>
						</div>
						<!-- Pokémon Sprite & Name Cell -->
						<div class={`p-1 flex flex-col items-center justify-center text-center ${getFeedbackBgClass(
							guess.feedback.supertypeValue === 'Pokémon' ? guess.feedback.pokemonCorrect : undefined
						)}`} title={getFeedbackHint('Pokémon', guess.feedback.supertypeValue === 'Pokémon' ? guess.feedback.pokemonCorrect : undefined)}>
							{#if guess.pokemonNumber && guess.feedback.supertypeValue === 'Pokémon'}
								<img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${guess.pokemonNumber}.png`} alt="Sprite for {guess.feedback.pokemonValue}" class="h-10 w-10 sm:h-12 sm:w-12 object-contain"/>
							{:else if guess.feedback.supertypeValue === 'Trainer' || guess.feedback.supertypeValue === 'Energy'}
								<span class="text-sm p-2">{guess.feedback.supertypeValue}</span>
							{:else}
								<span class="text-sm p-2">N/A</span>
							{/if}
							<span class="mt-1 text-center block leading-tight text-xs sm:text-sm">{guess.feedback.pokemonValue}</span>
						</div>
						<!-- Attribute Cells -->
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.artistCorrect)}`} title={getFeedbackHint('Artist', guess.feedback.artistCorrect)}>{guess.feedback.artistValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.setCorrect)}`} title={getFeedbackHint('Set', guess.feedback.setCorrect)}>{guess.feedback.setValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.supertypeCorrect)}`} title={getFeedbackHint('Supertype', guess.feedback.supertypeCorrect)}>{guess.feedback.supertypeValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.typesCorrect)}`} title={getFeedbackHint('Type', guess.feedback.typesCorrect)}>{guess.feedback.typesValue}</div>
						<div class={`p-2 flex flex-col items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.priceComparison === 'correct')}`} title={getPriceComparisonHint(guess.feedback.priceComparison)}>
							<span class="flex items-center justify-center gap-1">
								{#if guess.feedback.priceComparison === 'correct'}
									<CheckIcon size={16} />
								{:else if guess.feedback.priceComparison === 'higher'}
									<ChevronsUpIcon size={16} />
								{:else if guess.feedback.priceComparison === 'lower'}
									<ChevronsDownIcon size={16} />
								{/if}
								{guess.feedback.priceValue.toFixed(2)} €
							</span>
							<span class="text-xs">{getPriceComparisonText(guess.feedback.priceComparison)}</span>
						</div>
					</div>
					{#if guess.isCorrect}
						<p class="flex items-center justify-center gap-2 text-green-400 font-bold text-lg mt-2">
							<PartyPopperIcon size={20} /> Correct! You guessed the card!
						</p>
					{/if}
				</div>
			{/each}

			<!-- Loading Guess (if any) -->
			{#if loadingGuess}
				<div class="historic-guess-item mb-2 animate-pulse">
					<h3 class="font-bold text-lg my-2 text-center text-gold-400">
						Guess {historicGuesses.length + 1} - {loadingGuess.name}
						<span class="inline-flex items-center ml-2">
							<BouncyLoader size={16} speed={0.8} />
							<span class="ml-1 text-sm font-normal">Analyzing...</span>
						</span>
					</h3>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(5,minmax(80px,1fr))] gap-px bg-gray-700 border border-gray-600 rounded-b-md overflow-hidden text-sm items-stretch [&>div]:min-h-[50px]">
						<!-- Card Image Cell -->
						<div class="h-52 p-1 bg-gray-900 flex items-center justify-center aspect-[0.717]">
							<CardImage
								imageUrl={loadingGuess.cardImage}
								alt="Card: {loadingGuess.name}"
								class="max-w-full max-h-full object-contain rounded-sm opacity-75"
								lazy={true}
								lowRes={true}
							/>
						</div>
						<!-- Pokémon Sprite & Name Cell -->
						<div class="p-1 flex flex-col items-center justify-center text-center bg-gray-800 text-gray-300">
							{#if loadingGuess.pokemonNumber}
								<img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${loadingGuess.pokemonNumber}.png`} alt="Sprite" class="h-10 w-10 sm:h-12 sm:w-12 object-contain opacity-75"/>
							{:else}
								<div class="h-10 w-10 sm:h-12 sm:w-12 bg-gray-700 rounded-sm animate-pulse"></div>
							{/if}
							<span class="mt-1 text-center block leading-tight text-xs sm:text-sm opacity-75">{loadingGuess.name}</span>
						</div>
						<!-- Loading cells for attributes -->
						{#each Array(5) as _}
							<div class="p-2 flex items-center justify-center text-center bg-gray-800 text-gray-400">
								<div class="w-12 h-4 bg-gray-700 rounded-sm animate-pulse"></div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Search Section -->
	<div class="bg-gray-800 rounded-xl shadow-lg p-6 mt-6 mb-8 max-w-2xl mx-auto border border-gray-700">
		<div class="flex flex-col items-center">
			<div class="flex gap-3 w-full max-w-md justify-center">
				<TextInput
					id="searchInput"
					label="Start typing to search for Pokémon cards:"
					labelClass="font-bold text-xl text-gold-400 mb-4 text-center"
					bind:value={searchInput}
					placeholder="E.g., Pikachu, Charizard..."
					autocomplete="off"
					class="grow text-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 h-12 py-3"
					disabled={hasWon}
					debounceFunction={handleDebouncedSearch}
					debounceDelay={500}
					onKeydown={handleKeydown}
				/>
				<Button
					class="self-end h-12 px-6 font-bold text-lg"
					onClick={() => { searchInput = ''; activeSuggestions = []; }}
					disabled={hasWon}
					title="Empty the search field and the results"
				>
					<Trash2Icon size={18} /> Clear
				</Button>
			</div>

			{#if hasWon}
				<div class="mt-4 p-4 bg-green-900 border-2 border-green-600 rounded-lg text-center">
					<p class="flex items-center justify-center gap-2 text-green-300 font-bold text-lg">
						<PartyPopperIcon size={20} /> Congratulations! You found today's card!
					</p>
					<p class="text-green-400 text-sm mt-2">Come back tomorrow for a new challenge!</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Card Suggestions Grid -->
	<div class="my-8">
		<div class="bg-gray-800 rounded-xl shadow-lg p-6 max-w-7xl mx-auto border border-gray-700 flex flex-col items-center">
			{#if activeSuggestions.length > 0}
				<h3 class="flex items-center justify-center gap-2 text-2xl font-bold mb-6 text-gold-400">
					<TargetIcon size={22} /> Select a Card to Guess:
					<span class="text-lg font-normal text-gray-400">({activeSuggestions.length} found)</span>
				</h3>
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{#each activeSuggestions as suggestion (suggestion.cardCode)}
						<button
							type="button"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								selectSuggestion(suggestion);
							}}
							class="bg-gray-900 hover:bg-gray-700 p-3 rounded-xl shadow-md hover:shadow-xl focus:ring-2 focus:ring-gold-400 transition-all duration-200 hover:-translate-y-0.5 flex flex-col items-center text-center border border-gray-600 hover:border-gold-400 group relative {isSubmitting && loadingGuess?.cardImage === suggestion.image ? 'opacity-75 scale-95' : ''}"
							title={suggestion.name}
							disabled={isSubmitting || hasWon}
						>
							{#if isSubmitting && loadingGuess?.cardImage === suggestion.image}
								<div class="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
									<BouncyLoader size={24} speed={0.8} />
								</div>
							{/if}
							<div class="relative overflow-hidden rounded-lg mb-3 group-hover:scale-105 transition-transform duration-200">
								<CardImage
									imageUrl={suggestion.image}
									alt={suggestion.name}
									class="w-full h-auto object-contain aspect-[0.717] transition-opacity duration-300"
									lazy={true}
									lowRes={true}
								/>
							</div>
							<p class="text-sm leading-tight font-bold text-white mb-1">{suggestion.name}</p>
							<div class="flex items-center justify-center gap-1 text-xs text-gray-400">
								<span class="bg-green-800 text-green-300 px-2 py-1 rounded-full font-semibold" title="Cardmarket value of this card">
									{suggestion.price.toFixed(2)} €
								</span>
							</div>
						</button>
					{/each}
				</div>

				<div class="text-center mt-6">
					<Button
						onClick={() => { activeSuggestions = []; }}
						class="px-4 py-2"
						title="Hide these results and search again"
					>
						<RotateCcwIcon size={16} /> Search Again
					</Button>
				</div>
			{:else if searchInput.trim().length > 0}
				<div class="text-center py-8 flex flex-col items-center">
					<h3 class="flex items-center justify-center gap-2 text-xl font-bold mb-4 text-gray-400">
						<SearchIcon size={20} /> No cards found for "{searchInput}"
					</h3>
					<p class="text-gray-500 mb-4">Try searching for a different Pokémon name</p>
					<Button
						onClick={() => { searchInput = ''; activeSuggestions = []; }}
						class="px-4 py-2"
						title="Empty the search field"
					>
						<RotateCcwIcon size={16} /> Clear Search
					</Button>
				</div>
			{:else}
				<div class="text-center py-8">
					<h3 class="flex items-center justify-center gap-2 text-xl font-bold mb-4 text-gold-400">
						<TargetIcon size={20} /> Ready to Play?
					</h3>
					<p class="text-gray-300">Search for a Pokémon name above to see available cards!</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Example Grid (shown when no guesses have been made) -->
	{#if historicGuesses.length === 0 && !activeSuggestions.length}
		<div class="mt-8 mb-8">
			<h3 class="flex items-center justify-center gap-2 text-2xl font-bold mb-6 text-gold-400">
				<ClipboardListIcon size={22} /> This is how your guesses will appear:
			</h3>
			<div class="bg-gray-800 rounded-xl shadow-lg p-6 max-w-6xl mx-auto border border-gray-700">
				<!-- Example Header -->
				<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(5,minmax(80px,1fr))] gap-px font-semibold text-center mb-3 bg-gray-900 text-gold-400 p-2 rounded-t-md text-sm">
					<div class="p-2">Card</div>
					<div class="flex items-center justify-center gap-1 p-2"><PawPrintIcon size={14} /> Pokémon</div>
					<div class="flex items-center justify-center gap-1 p-2"><PaintbrushIcon size={14} /> Artist</div>
					<div class="flex items-center justify-center gap-1 p-2"><LibraryIcon size={14} /> Set</div>
					<div class="flex items-center justify-center gap-1 p-2"><LayersIcon size={14} /> Supertype</div>
					<div class="flex items-center justify-center gap-1 p-2"><SparklesIcon size={14} /> Type(s)</div>
					<div class="flex items-center justify-center gap-1 p-2"><CircleEuroIcon size={14} /> Price</div>
				</div>

				<!-- Example Row -->
				<div class="mb-2">
					<h4 class="font-bold text-lg my-2 text-center text-gray-400">Guess 1 - Example Card Name</h4>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(5,minmax(80px,1fr))] gap-px bg-gray-700 border border-gray-600 rounded-b-md overflow-hidden text-sm items-stretch [&>div]:min-h-[50px]">
						<!-- Example Card Image -->
						<div class="h-52 p-1 bg-gray-900 flex items-center justify-center">
							<div class="w-full h-full bg-linear-to-br from-gray-700 to-gray-800 rounded-sm flex items-center justify-center">
								<span class="text-gray-400 text-xs text-center">Card<br/>Image</span>
							</div>
						</div>
						<!-- Example Pokémon Sprite -->
						<div class="p-1 flex flex-col items-center justify-center text-center bg-red-600 text-white">
							<CircleXIcon size={28} />
							<span class="mt-1 text-center block text-sm">Wrong Pokémon</span>
						</div>
						<!-- Example attributes -->
						<div class="p-2 flex items-center justify-center gap-1 text-center bg-green-600 text-white"><CheckIcon size={16} /> Correct Artist</div>
						<div class="p-2 flex items-center justify-center gap-1 text-center bg-red-600 text-white"><XIcon size={16} /> Wrong Set</div>
						<div class="p-2 flex items-center justify-center gap-1 text-center bg-green-600 text-white"><CheckIcon size={16} /> Pokémon</div>
						<div class="p-2 flex items-center justify-center gap-1 text-center bg-red-600 text-white"><XIcon size={16} /> Fire</div>
						<div class="p-2 flex flex-col items-center justify-center text-center bg-red-600 text-white">
							<span class="flex items-center justify-center gap-1"><ChevronsUpIcon size={16} /> 15.99 €</span>
							<span class="text-xs">Mystery card is higher</span>
						</div>
					</div>
				</div>

				<div class="text-center mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
					<p class="flex items-start justify-center gap-2 text-sm text-gold-400">
						<LightbulbIcon class="mt-0.5 shrink-0" size={16} />
						<span>
							<strong>This example shows:</strong> the artist matches the mystery card (green),
							but the Pokémon, set and type are wrong (red). The arrow says the mystery card costs more than 15.99 €.
						</span>
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Rules Modal -->
<Modal
	bind:open={showRulesModal}
	containerClass="max-w-3xl"
	onClose={() => showRulesModal = false}
>
	{#snippet header()}
		<h2 id="modal-title" class="flex items-center gap-2 text-xl font-medium text-gold-400">
			<Gamepad2Icon size={20} /> How to play Card.dle
		</h2>
	{/snippet}

	<div class="space-y-4 text-gray-300">
		<p class="text-sm text-gray-400">
			One mystery card per day, the same for everyone. Every guess compares six attributes with it, so keep narrowing
			until they all turn green.
		</p>

		<!-- Steps -->
		<section>
			<h3 class="flex items-center gap-2 font-bold text-gold-400 mb-2"><ClipboardListIcon size={16} /> Three steps</h3>
			<ol class="grid gap-3 sm:grid-cols-3">
				{#each rulesSteps as step, i (step.title)}
					<li class="relative rounded-lg border border-gray-700 bg-gray-900 p-3 pl-11">
						<span class="absolute left-3 top-3 flex size-6 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-black">{i + 1}</span>
						<p class="font-semibold text-white">{step.title}</p>
						<p class="mt-1 text-xs text-gray-400">{step.detail}</p>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Attributes -->
		<section>
			<h3 class="flex items-center gap-2 font-bold text-gold-400 mb-2"><TagIcon size={16} /> The six compared attributes</h3>
			<div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
				{#each rulesAttributes as attribute (attribute.name)}
					<div class="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
						<attribute.icon class="mt-0.5 shrink-0 text-gold-400" size={16} />
						<div>
							<p class="font-semibold text-white">{attribute.name}</p>
							<p class="text-xs text-gray-400">{attribute.detail}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Feedback legend -->
		<section>
			<h3 class="flex items-center gap-2 font-bold text-gold-400 mb-2"><PaletteIcon size={16} /> Reading a row</h3>
			<div class="grid gap-2 sm:grid-cols-2">
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-green-600 text-xs font-semibold text-white"><CheckIcon size={14} /> Match</span>
					<p class="text-xs text-gray-400">Same value as the mystery card.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><XIcon size={14} /> Wrong</span>
					<p class="text-xs text-gray-400">Different value, look elsewhere.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><ChevronsUpIcon size={14} /> 15.99 €</span>
					<p class="text-xs text-gray-400">The mystery card costs more than your guess.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><ChevronsDownIcon size={14} /> 15.99 €</span>
					<p class="text-xs text-gray-400">The mystery card costs less than your guess.</p>
				</div>
			</div>
		</section>

		<!-- Good to know and strategy -->
		<div class="grid gap-3 md:grid-cols-2">
			<section class="rounded-lg border border-gray-700 bg-gray-900 p-3">
				<h3 class="flex items-center gap-2 font-bold text-gold-400 mb-2"><InfoIcon size={16} /> Good to know</h3>
				<ul class="space-y-1.5 text-sm">
					{#each rulesNotes as note (note)}
						<li class="flex items-start gap-2"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-gold-400"></span> {note}</li>
					{/each}
				</ul>
			</section>

			<section class="rounded-lg border border-gray-700 bg-gray-900 p-3">
				<h3 class="flex items-center gap-2 font-bold text-gold-400 mb-2"><LightbulbIcon size={16} /> Strategy</h3>
				<ul class="space-y-1.5 text-sm">
					{#each rulesTips as tip (tip)}
						<li class="flex items-start gap-2"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-gold-400"></span> {tip}</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>

	{#snippet footer()}
		<Button onClick={() => showRulesModal = false} class="px-4 py-2" title="Close the rules">
			<CheckIcon size={16} /> Got it
		</Button>
	{/snippet}
</Modal>

