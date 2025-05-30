<script lang="ts">
	import type { ActionData, PageData } from './$types'; // PageData for cardSuggestions
	import { enhance } from '$app/forms'; // For progressive enhancement

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
			searchInput = '';
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

	// This function is now called by the search button
	function displayMatchingCards() {
		if (searchInput.trim().length > 0) {
			const searchTerm = searchInput.trim().toLowerCase();
			activeSuggestions = (data.cardSuggestions || []).filter(card =>
				card.pokemonName.toLowerCase().includes(searchTerm) ||
				card.name.toLowerCase().includes(searchTerm)
			);
		} else {
			activeSuggestions = []; // Clear suggestions if search input is empty
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

	// Updated to return background and text color classes
	function getFeedbackBgClass(correct: boolean | undefined, isPokemonCell: boolean = false): string {
		if (correct === undefined && !isPokemonCell) return 'bg-base-100 text-base-content'; // Neutral for non-Pokémon cells if no feedback
        if (correct === undefined && isPokemonCell) return 'bg-base-100 text-base-content'; // Default for Pokémon cell if no explicit correctness (e.g. Trainer)

		return correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
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

<div class="container mx-auto p-4">
	<h1 class="text-3xl font-bold text-center mb-8">Card.dle</h1>

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
			<label for="searchInput" class="mb-2 font-semibold">Enter Pokémon Name:</label>
			<div class="flex gap-2 w-full max-w-md justify-center">
				<input
					type="text"
					id="searchInput"
					name="searchInput"
					bind:value={searchInput}
					class="input input-bordered flex-grow"
					autocomplete="off"
					placeholder="E.g., Pikachu"
					disabled={form?.isCorrectGuess}
					on:input={() => { activeSuggestions = [] }}  />
					<!-- Clear suggestions on new input, search button will repopulate -->
				<button type="button" class="btn btn-primary" on:click={displayMatchingCards} disabled={form?.isCorrectGuess}>
					Search
				</button>
			</div>
			<input type="hidden" name="guessedCardId" bind:this={guessedCardIdInput} />
		</div>
	</form>

	{#if form?.error && !form.success} <!-- Show only if it's a submission error, not validation for fields -->
		<p class="text-red-500 text-center mb-4 bg-red-100 p-2 rounded">{form.error}</p>
	{/if}

	<!-- Display Card Suggestions Grid (after search) -->
	{#if activeSuggestions.length > 0}
		<div class="my-6">
			<h3 class="text-xl font-semibold mb-4 text-center">Select a Card:</h3>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{#each activeSuggestions as suggestion (suggestion.cardCode)}
					<button
						type="button"
						on:click={() => selectSuggestion(suggestion)}
						class="card-suggestion-button bg-base-200 p-2 rounded-lg shadow hover:shadow-xl focus:ring-2 focus:ring-primary transition-all duration-150 flex flex-col items-center text-center"
						title={suggestion.name}
					>
						<img
							src={suggestion.image}
							alt={suggestion.name}
							class="w-full h-auto object-contain rounded mb-2 aspect-[0.717]"
							loading="lazy"
						/>
						<p class="text-xs leading-tight font-semibold">{suggestion.name}</p>
						<p class="text-xxs opacity-80">${suggestion.price.toFixed(2)} - {suggestion.year}</p>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Display Historic Guesses -->
	<div class="mt-8 w-full overflow-x-auto" bind:this={historicGuessesContainer}>
		{#if historicGuesses.length > 0}
            <!-- Global Header for the Grid -->
            <div class="historic-guesses-header grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px font-semibold text-center mb-1 bg-gray-700 text-white p-1 rounded-t-md text-xs sticky top-0 z-10">
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
					<h3 class="font-bold text-lg my-2 text-center">Guess {historicGuesses.length - i} - {guess.name}</h3>
					<div class="grid grid-cols-[minmax(80px,auto)_minmax(100px,auto)_repeat(6,minmax(80px,1fr))] gap-px bg-gray-600 border border-gray-500 rounded-b-md overflow-hidden text-xs items-stretch">
						<!-- Card Image Cell -->
						<div class="h-52 p-1 bg-base-200 flex items-center justify-center aspect-[0.717]">
							<img src={guess.cardImage} alt="Card: {guess.name}" class="max-w-full max-h-full object-contain rounded" loading="lazy"/>
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
						<p class="text-green-500 font-bold text-lg mt-2 text-center">🎉 Correct! You guessed the card! 🎉</p>
					{/if}
				</div>
			{/each}
        {/if}
	</div>

	<!-- Debug: Display card of the day (if available from server load) -->
	{#if data.cardOfTheDayForTesting}
		<div class="mt-8 p-4 bg-gray-700 rounded text-xs text-gray-300 max-w-xl mx-auto">
			<h3 class="font-bold mb-1">For Testing - Card of the Day:</h3>
			<pre>{JSON.stringify(data.cardOfTheDayForTesting, null, 2)}</pre>
		</div>
	{/if}
</div>

<style>
	.text-xxs { /* Custom utility if not in Tailwind base */
		font-size: 0.65rem; /* Adjust as needed */
		line-height: 0.85rem; /* Adjust as needed */
	}
    .historic-guesses-header {
        /* Ensures the header stays on top when scrolling, useful for many guesses */
    }
    .grid {
        align-items: stretch; /* Default, ensure cells in a row have same height if content varies */
    }
    .grid > div {
        min-height: 50px; /* Ensure cells have a minimum height for readability */
    }
</style> 