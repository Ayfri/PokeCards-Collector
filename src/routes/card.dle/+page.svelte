<script lang="ts">
	import type { ActionData, PageData } from './$types'; // PageData for cardSuggestions
	import { enhance } from '$app/forms'; // For progressive enhancement
	import Modal from '@components/ui/Modal.svelte'; // Import Modal for rules
	import CardImage from '@components/card/CardImage.svelte'; // Import CardImage component
	import TextInput from '@components/filters/TextInput.svelte'; // Import TextInput component
	import Button from '@components/filters/Button.svelte'; // Import Button component

	export let data: PageData; // Loaded from +page.server.ts (contains cardSuggestions)
	export let form: ActionData; // Result of form actions

	let searchInput = ''; // User's input for Pokémon name
	let activeSuggestions: {
		name: string;
		cardCode: string;
		pokemonName: string;
		image: string;
		price: number;
		year: string;
	}[] = [];
	let historicGuesses: {
		id: number;
		name: string; // This is the card name, used for the Guess X - Name title
		cardImage: string;
		pokemonNumber?: number;
		feedback: any;
		isCorrect: boolean;
	}[] = [];

	let guessFormElement: HTMLFormElement;
	let guessedCardIdInput: HTMLInputElement;
	let historicGuessesContainer: HTMLDivElement;
	let showRulesModal = false; // Toggle for rules modal

	// When form data (ActionData) is returned from the server action
	$: if (form?.success) {
		const newGuess = {
			id: new Date().getTime(),
			name: form.guessedCardName, // Card name for the title
			cardImage: form.guessedCardImage,
			pokemonNumber: form.guessedPokemonNumber,
			feedback: form.feedback,
			isCorrect: form.isCorrectGuess
		};
		historicGuesses = [newGuess, ...historicGuesses];
		if (form.isCorrectGuess) {
			activeSuggestions = [];
		}
		// Smooth scroll to the historic guesses section
		// Use timeout to ensure the element is rendered before scrolling
		setTimeout(() => {
			historicGuessesContainer?.scrollIntoView({ behavior: 'smooth' });
		}, 0);
	} else if (form?.error) {
		// Handle server-side validation errors if needed (e.g., display in a toast)
		console.error("Form error:", form.error);
	}

	// This function is now called by the search button or Enter key
	function displayMatchingCards() {
		if (searchInput.trim().length > 0) {
			const searchTerm = searchInput.trim().toLowerCase();
			activeSuggestions = (data.cardSuggestions || []).filter(card =>
				card.pokemonName.toLowerCase().includes(searchTerm) ||
				card.name.toLowerCase().includes(searchTerm)
			);
			// Clear the input after search
			searchInput = '';
		} else {
			activeSuggestions = []; // Clear suggestions if search input is empty
		}
	}

	// Handle Enter key press
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			displayMatchingCards();
		}
	}

	function selectSuggestion(card: any) {
		if (guessedCardIdInput) {
			guessedCardIdInput.value = card.cardCode;
		}
		if (guessFormElement) {
			guessFormElement.requestSubmit();
		}
	}

	// Updated to return background and text color classes with dark theme
	function getFeedbackBgClass(correct: boolean | undefined, isPokemonCell: boolean = false): string {
		if (correct === undefined && !isPokemonCell) return 'bg-gray-800 text-gray-300'; // Neutral for non-Pokémon cells if no feedback
        if (correct === undefined && isPokemonCell) return 'bg-gray-800 text-gray-300'; // Default for Pokémon cell if no explicit correctness (e.g. Trainer)

		return correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
	}

	function getPriceComparisonIcon(comparison: string | undefined): string {
		if (comparison === 'correct') return '✅';
		if (comparison === 'higher') return '🔼';
		if (comparison === 'lower') return '🔽';
		return '';
	}
    function getPriceComparisonText(comparison: string | undefined): string {
		if (comparison === 'higher') return '(Higher)';
		if (comparison === 'lower') return '(Lower)';
		return '';
	}

</script>

<svelte:head>
	<title>Card.dle - Guess the Pokémon Card</title>
	<meta name="description" content="Play Card.dle and try to guess the daily Pokémon card!" />
</svelte:head>

<div class="container mx-auto p-4 text-white">
	<!-- Hero Section -->
	<div class="text-center mb-8">
		<h1 class="text-5xl font-bold mb-4 bg-gradient-to-r from-gold-400 via-yellow-400 to-gold-400 bg-clip-text text-transparent">
			Card.dle
		</h1>
		<p class="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
			The daily Pokémon TCG guessing game! Can you identify today's mystery card?
		</p>

		<!-- Game Introduction -->
		<div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8 max-w-3xl mx-auto shadow-lg">
			<div class="flex items-center justify-center gap-3 mb-4">
				<span class="text-3xl">🃏</span>
				<h2 class="text-2xl font-bold text-gold-400">How to Play</h2>
				<span class="text-3xl">⚡</span>
			</div>

			<div class="text-center space-y-4 flex flex-col items-center">
				<p class="text-gray-300 text-lg">
					<strong class="text-gold-400">🎯</strong> Guess the daily Pokémon card by comparing attributes!
				</p>

				<!-- Simplified Color Guide -->
				<div class="flex items-center justify-center gap-6 text-sm">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-600 rounded"></div>
						<span class="text-green-400">Correct</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-600 rounded"></div>
						<span class="text-red-400">Wrong</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-lg">🔼🔽</span>
						<span class="text-gold-400">Price hints</span>
					</div>
				</div>

				<div class="text-center">
					<Button
						onClick={() => showRulesModal = true}
						class="px-4 py-2"
					>
						📋 View Detailed Rules
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Game Progress Section (moved above search) -->
	{#if historicGuesses.length > 0}
		<div class="mb-6 bg-gray-800 rounded-xl shadow-lg p-4 max-w-4xl mx-auto border border-gray-700">
			<h3 class="text-xl font-bold text-center mb-3 text-gold-400">
				🎮 Your Guesses ({historicGuesses.length})
			</h3>
			<div class="flex items-center justify-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 bg-green-600 rounded-full"></span>
					<span class="text-gray-300">Perfect match</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 bg-red-600 rounded-full"></span>
					<span class="text-gray-300">Wrong</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-lg">🔼🔽</span>
					<span class="text-gray-300">Price hints</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Game Form -->
	<div class="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto border border-gray-700">
		<form
			method="POST"
			action="?/guess"
			id="guessForm"
			class="mb-4"
			bind:this={guessFormElement}
			use:enhance={() => {
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<div class="flex flex-col items-center">
				<div class="flex gap-3 w-full max-w-md justify-center">
					<TextInput
						id="searchInput"
						label="🔍 Start your guess - Enter Pokémon Name:"
						labelClass="font-bold text-lg text-gold-400 mb-4 text-center"
						bind:value={searchInput}
						placeholder="E.g., Pikachu, Charizard..."
						autocomplete="off"
						class="flex-grow text-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 h-12 py-3"
						disabled={form?.isCorrectGuess}
						onInput={() => { activeSuggestions = [] }}
						onKeydown={handleKeydown}
					/>
					<Button
						class="self-end h-12 px-6 font-bold text-lg"
						onClick={displayMatchingCards}
						disabled={form?.isCorrectGuess}
					>
						🔍 Search
					</Button>
				</div>
				<input type="hidden" name="guessedCardId" bind:this={guessedCardIdInput} />

				{#if form?.isCorrectGuess}
					<div class="mt-4 p-4 bg-green-900 border-2 border-green-600 rounded-lg text-center">
						<p class="text-green-300 font-bold text-lg">🎉 Congratulations! You found today's card! 🎉</p>
						<p class="text-green-400 text-sm mt-2">Come back tomorrow for a new challenge!</p>
					</div>
				{/if}
			</div>
		</form>
	</div>

	{#if form?.error && !form.success} <!-- Show only if it's a submission error, not validation for fields -->
		<p class="text-red-400 text-center mb-4 bg-red-900 border border-red-600 p-2 rounded">{form.error}</p>
	{/if}

	<!-- Display Card Suggestions Grid (always show after search or when there are results) -->
	<div class="my-8">
		<div class="bg-gray-800 rounded-xl shadow-lg p-6 max-w-7xl mx-auto border border-gray-700 flex flex-col items-center">
			{#if activeSuggestions.length > 0}
				<h3 class="text-2xl font-bold mb-6 text-center text-gold-400">
					🎯 Select a Card to Guess:
					<span class="text-lg font-normal text-gray-400">({activeSuggestions.length} found)</span>
				</h3>
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{#each activeSuggestions as suggestion (suggestion.cardCode)}
						<button
							type="button"
							on:click={() => selectSuggestion(suggestion)}
							class="card-suggestion-button bg-gray-900 hover:bg-gray-700 p-3 rounded-xl shadow-md hover:shadow-xl focus:ring-2 focus:ring-gold-400 transition-all duration-200 flex flex-col items-center text-center border border-gray-600 hover:border-gold-400 group"
							title={suggestion.name}
						>
							<div class="relative overflow-hidden rounded-lg mb-3 group-hover:scale-105 transition-transform duration-200">
								<CardImage
									imageUrl={suggestion.image}
									alt={suggestion.name}
									class="w-full h-auto object-contain aspect-[0.717]"
									lazy={true}
								/>
							</div>
							<p class="text-xs leading-tight font-bold text-white mb-1">{suggestion.name}</p>
							<div class="flex items-center justify-center gap-1 text-xxs text-gray-400">
								<span class="bg-green-800 text-green-300 px-2 py-1 rounded-full font-semibold">
									${suggestion.price.toFixed(2)}
								</span>
								<span class="bg-gold-400 text-black px-2 py-1 rounded-full font-semibold">
									{suggestion.year}
								</span>
							</div>
						</button>
					{/each}
				</div>

				<div class="text-center mt-6">
					<Button
						onClick={() => { activeSuggestions = []; }}
						class="px-4 py-2"
					>
						↩️ Search Again
					</Button>
				</div>
			{:else if searchInput.trim().length > 0}
				<div class="text-center py-8 flex flex-col items-center">
					<h3 class="text-xl font-bold mb-4 text-gray-400">
						🔍 No cards found for "{searchInput}"
					</h3>
					<p class="text-gray-500 mb-4">Try searching for a different Pokémon name</p>
					<Button
						onClick={() => { activeSuggestions = []; }}
						class="px-4 py-2"
					>
						↩️ Clear Search
					</Button>
				</div>
			{:else}
				<div class="text-center py-8">
					<h3 class="text-xl font-bold mb-4 text-gold-400">
						🎯 Ready to Play?
					</h3>
					<p class="text-gray-300">Search for a Pokémon name above to see available cards!</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Example Grid (shown when no guesses have been made) -->
	{#if historicGuesses.length === 0 && !activeSuggestions.length}
		<div class="mt-8 mb-8">
			<h3 class="text-2xl font-bold text-center mb-6 text-gold-400">
				📋 This is how your guesses will appear:
			</h3>
			<div class="bg-gray-800 rounded-xl shadow-lg p-6 max-w-6xl mx-auto border border-gray-700">
				<!-- Example Header -->
				<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px font-semibold text-center mb-3 bg-gray-900 text-gold-400 p-2 rounded-t-md text-xs">
					<div class="p-2">Card</div>
					<div class="p-2">Pokémon Details</div>
					<div class="p-2">Artist</div>
					<div class="p-2">Set</div>
					<div class="p-2">Year</div>
					<div class="p-2">Supertype</div>
					<div class="p-2">Type(s)</div>
					<div class="p-2">Price</div>
				</div>

				<!-- Example Row -->
				<div class="mb-2">
					<h4 class="font-bold text-lg my-2 text-center text-gray-400">Guess 1 - Example Card Name</h4>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px bg-gray-700 border border-gray-600 rounded-b-md overflow-hidden text-xs items-stretch">
						<!-- Example Card Image -->
						<div class="h-52 p-1 bg-gray-900 flex items-center justify-center">
							<div class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center">
								<span class="text-gray-400 text-xs text-center">Card<br/>Image</span>
							</div>
						</div>
						<!-- Example Pokémon Sprite -->
						<div class="p-1 flex flex-col items-center justify-center text-center bg-red-600 text-white">
							<div class="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-xs">🔴</div>
							<span class="mt-1 text-center block text-xs">Wrong Pokémon</span>
						</div>
						<!-- Example attributes -->
						<div class="p-2 flex items-center justify-center text-center bg-green-600 text-white">✅ Correct Artist</div>
						<div class="p-2 flex items-center justify-center text-center bg-red-600 text-white">❌ Wrong Set</div>
						<div class="p-2 flex items-center justify-center text-center bg-green-600 text-white">✅ 2023</div>
						<div class="p-2 flex items-center justify-center text-center bg-green-600 text-white">✅ Pokémon</div>
						<div class="p-2 flex items-center justify-center text-center bg-red-600 text-white">❌ Fire</div>
						<div class="p-2 flex flex-col items-center justify-center text-center bg-red-600 text-white">
							<span>🔼 $15.99</span>
							<span class="text-xxs">(Higher)</span>
						</div>
					</div>
				</div>

				<div class="text-center mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
					<p class="text-sm text-gold-400">
						<strong>💡 This example shows:</strong> The artist and year match the mystery card (green),
						but the Pokémon, set, and type are wrong (red). The price arrow indicates the mystery card costs less than $15.99.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Display Historic Guesses -->
	<div class="mt-8 w-full overflow-x-auto" bind:this={historicGuessesContainer}>
		{#if historicGuesses.length > 0}
            <!-- Global Header for the Grid -->
            <div class="historic-guesses-header grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px font-semibold text-center mb-1 bg-gray-900 text-gold-400 p-1 rounded-t-md text-xs sticky top-0 z-10">
                <div class="p-2">Card</div>
                <div class="p-2">Pokémon Details</div>
                <div class="p-2">Artist</div>
                <div class="p-2">Set</div>
                <div class="p-2">Year</div>
                <div class="p-2">Supertype</div>
                <div class="p-2">Type(s)</div>
                <div class="p-2">Price</div>
            </div>

			{#each historicGuesses as guess, i (guess.id)}
				<div class="historic-guess-item mb-2">
					<h3 class="font-bold text-lg my-2 text-center text-gold-400">Guess {historicGuesses.length - i} - {guess.name}</h3>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px bg-gray-700 border border-gray-600 rounded-b-md overflow-hidden text-xs items-stretch">
						<!-- Card Image Cell -->
						<div class="h-52 p-1 bg-gray-900 flex items-center justify-center aspect-[0.717]">
							<CardImage
								imageUrl={guess.cardImage}
								alt="Card: {guess.name}"
								class="max-w-full max-h-full object-contain rounded"
								lazy={true}
							/>
						</div>
						<!-- Pokémon Sprite & Name Cell -->
						<div class={`p-1 flex flex-col items-center justify-center text-center ${getFeedbackBgClass(
							guess.feedback.supertypeValue === 'Pokémon' ? guess.feedback.pokemonCorrect : undefined,
							guess.feedback.supertypeValue === 'Pokémon' // This is the isPokemonCell argument
						)}`}>
							{#if guess.pokemonNumber && guess.feedback.supertypeValue === 'Pokémon'}
								<img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${guess.pokemonNumber}.png`} alt="Sprite for {guess.feedback.pokemonValue}" class="h-10 w-10 sm:h-12 sm:w-12 object-contain"/>
                            {:else if guess.feedback.supertypeValue === 'Trainer' || guess.feedback.supertypeValue === 'Energy'}
                                <span class="text-sm p-2">{guess.feedback.supertypeValue}</span>
                            {:else}
                                <span class="text-sm p-2">N/A</span>
							{/if}
							<span class="mt-1 text-center block leading-tight text-xxs sm:text-xs">{guess.feedback.pokemonValue}</span>
						</div>
						<!-- Attribute Cells -->
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.artistCorrect)}`}>{guess.feedback.artistValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.setCorrect)}`}>{guess.feedback.setValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.yearCorrect)}`}>{guess.feedback.yearValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.supertypeCorrect)}`}>{guess.feedback.supertypeValue}</div>
						<div class={`p-2 flex items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.typesCorrect)}`}>{guess.feedback.typesValue}</div>
						<div class={`p-2 flex flex-col items-center justify-center text-center ${getFeedbackBgClass(guess.feedback.priceComparison === 'correct')}`}>
							<span>{getPriceComparisonIcon(guess.feedback.priceComparison)} ${guess.feedback.priceValue.toFixed(2)}</span>
							<span class="text-xxs">{getPriceComparisonText(guess.feedback.priceComparison)}</span>
						</div>
					</div>
					{#if guess.isCorrect}
						<p class="text-green-400 font-bold text-lg mt-2 text-center">🎉 Correct! You guessed the card! 🎉</p>
					{/if}
				</div>
			{/each}
        {/if}
	</div>

	<!-- Debug: Display card of the day (if available from server load) -->
	{#if data.cardOfTheDayForTesting}
		<div class="mt-8 p-4 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400 max-w-xl mx-auto">
			<h3 class="font-bold mb-1 text-gold-400">For Testing - Card of the Day:</h3>
			<pre class="text-gray-300">{JSON.stringify(data.cardOfTheDayForTesting, null, 2)}</pre>
		</div>
	{/if}
</div>

<!-- Rules Modal -->
<Modal
	bind:open={showRulesModal}
	title="Card.dle - Rules"
	containerClass="max-w-5xl"
	onClose={() => showRulesModal = false}
>
	<div class="space-y-4 text-gray-300">
		<!-- Card Attributes -->
		<div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
			<h3 class="font-bold text-gold-400 mb-3">🏷️ Attributes:</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
				<div><strong class="text-white">Pokémon:</strong> Character name</div>
				<div><strong class="text-white">Artist:</strong> Card illustrator</div>
				<div><strong class="text-white">Set:</strong> Collection name</div>
				<div><strong class="text-white">Year:</strong> Release year</div>
				<div><strong class="text-white">Supertype:</strong> Pokémon/Trainer/Energy</div>
				<div><strong class="text-white">Type:</strong> Element (Fire, Water...)</div>
				<div><strong class="text-white">Price:</strong> Market value (USD)</div>
			</div>
		</div>

		<!-- Game Rules -->
		<div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
			<h3 class="font-bold text-gold-400 mb-3">📋 How to Play:</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<ul class="space-y-1 list-disc list-inside">
					<li>Search Pokémon name → Select card → Get feedback</li>
					<li><strong class="text-green-400">Green</strong> = perfect match</li>
					<li><strong class="text-red-400">Red</strong> = wrong attribute</li>
					<li><strong>🔼</strong> mystery card costs more, <strong>🔽</strong> costs less</li>
				</ul>
				<ul class="space-y-1 list-disc list-inside">
					<li>Trainer/Energy cards show "None" for Type</li>
					<li>Match all attributes to win</li>
					<li>New mystery card daily</li>
					<li>Unlimited attempts</li>
				</ul>
			</div>
		</div>

		<!-- Tips -->
		<div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
			<h3 class="font-bold text-gold-400 mb-3">💡 Strategy:</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<ul class="space-y-1 list-disc list-inside">
					<li>Start with popular Pokémon (Pikachu, Charizard)</li>
					<li>Use price arrows to narrow search</li>
				</ul>
				<ul class="space-y-1 list-disc list-inside">
					<li>Same set/year → try other cards from collection</li>
					<li>Different printings = different artists/prices</li>
				</ul>
			</div>
		</div>
	</div>
</Modal>

<style>
	.text-xxs {
		font-size: 0.65rem;
		line-height: 0.85rem;
	}
    .grid {
        align-items: stretch;
    }
    .grid > div {
        min-height: 50px;
    }

	/* Custom animations and improvements */
	.card-suggestion-button {
		transform-origin: center;
	}

	.card-suggestion-button:hover {
		transform: translateY(-2px);
	}

	/* Smooth gradient text animation */
	@keyframes gradient-x {
		0%, 100% {
			background-size: 200% 200%;
			background-position: left center;
		}
		50% {
			background-size: 200% 200%;
			background-position: right center;
		}
	}

	.bg-gradient-to-r {
		animation: gradient-x 6s ease infinite;
	}

	/* Loading state for card images */
	.card-suggestion-button img {
		transition: opacity 0.3s ease;
	}
</style>
