<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { Card } from '$lib/types'; // Assuming Card type is needed for local state
	import Numpad from '$lib/components/Numpad.svelte'; // Import Numpad
	import PageTitle from '$lib/components/PageTitle.svelte'; // Import PageTitle

	export let data: PageData;

	// Local state for the currently displayed card details
	let displayedCard: Card | null = null;
	let displayedCardPrice: number | null = null;
	let displayedReleaseDate: Date | null = null;

	let guessString: string = '';
	let message: string = '';
	let feedbackColor: string = '';
	let showConfetti: boolean = false;
	let guessSubmitted: boolean = false; // True after a guess is made, false after Play Again
	let isLoadingNextCard: boolean = false; // True while invalidateAll from checkGuess is running

	let dataSnapshotForLoadingCheck = data; // Snapshot to detect data prop update

	// Initialize displayed card data on initial load
	// This runs once when the component mounts and `data` is first available.
	// Subsequent updates to displayedCard are handled by playAgain.
	$: if (data.currentCard && !displayedCard) { // Only set if displayedCard is not yet set
		displayedCard = data.currentCard;
		displayedCardPrice = data.currentCardPrice;
		displayedReleaseDate = data.currentReleaseDate ? new Date(data.currentReleaseDate) : null;
		// Initial game state reset
		message = '';
		guessString = ''; // Reset guessString
		showConfetti = false;
		guessSubmitted = false;
	} else if (!data.currentCard && !displayedCard && data.error) {
		// Handle initial error from server if no card is loaded
		message = data.error;
		feedbackColor = 'text-red-400';
	}

	// Reactive block to manage loading state after checkGuess initiates a fetch
	$: {
		if (isLoadingNextCard && data !== dataSnapshotForLoadingCheck) {
			isLoadingNextCard = false;
			dataSnapshotForLoadingCheck = data; // Update snapshot for the next cycle
		}
	}

	function handleNumpadKeyPress(key: string) {
		if (guessSubmitted) return; // Don't allow input after submission

		if (key === 'Backspace') {
			guessString = guessString.slice(0, -1);
		} else if (key === 'C') {
			guessString = '';
		} else if (key === '.') { 
			// This case should ideally not be reached if decimal point is removed from numpad
			// and input filtering is in place. But as a safeguard:
			return; 
		} else { // Digit from Numpad
			guessString += key;
		}
	}

	// Function to handle manual input and filter non-digits
	function handleGuessInput(event: Event) {
		if (guessSubmitted) return;
		const inputElement = event.target as HTMLInputElement;
		// Replace any non-digit characters with an empty string
		const filteredValue = inputElement.value.replace(/\D/g, '');
		guessString = filteredValue;
		// Svelte might not immediately update the input visually if the value was programmatically changed
		// to a substring of its previous value (e.g. "1a2" becoming "12"). 
		// Forcing an update if necessary, though bind:value should handle it.
		if (inputElement.value !== filteredValue) {
			inputElement.value = filteredValue;
		}
	}

	function checkGuess() {
		const guess = parseInt(guessString, 10); // Changed to parseInt
		if (isNaN(guess)) {
			message = 'Please enter a valid price.';
			feedbackColor = 'text-red-400';
			return;
		}

		guessSubmitted = true;
		isLoadingNextCard = true;
		dataSnapshotForLoadingCheck = data;

		const actualPrice = displayedCardPrice !== null ? Math.round(displayedCardPrice) : null; // Round actual price

		if (actualPrice === null) { // Should not happen if displayedCard is present
			message = 'Error: Card price is not available.';
			feedbackColor = 'text-red-400';
			isLoadingNextCard = false;
			return;
		}

		const difference = Math.abs(guess - actualPrice);
		const percentageDifference = actualPrice > 0 ? (difference / actualPrice) * 100 : Infinity;

		if (guess === actualPrice) {
			message = `Correct! The price was ${actualPrice}$! You're a Pokémon Master!`; // Removed .toFixed(2)
			feedbackColor = 'text-green-400';
			showConfetti = true;
		} else {
			showConfetti = false;
			const priceRevealed = `The correct price was ${actualPrice}$.`; // Removed .toFixed(2)
			if (guess < actualPrice) {
				feedbackColor = 'text-yellow-400';
				if (percentageDifference > 75) {
					message = `Way too low! ${priceRevealed}`;
				} else if (percentageDifference > 30) {
					message = `A bit low. ${priceRevealed}`;
				} else {
					message = `So close! Just a little bit more. ${priceRevealed}`;
				}
			} else { // Guess > actualPrice
				feedbackColor = 'text-orange-400';
				if (percentageDifference > 75) {
					message = `Way too high! ${priceRevealed}`;
				} else if (percentageDifference > 30) {
					message = `A bit too high. ${priceRevealed}`;
				} else {
					message = `So close! Just a little bit less. ${priceRevealed}`;
				}
			}
		}
		// After guess processing, pre-fetch next card data.
		// isLoadingNextCard is already true.
		invalidateAll(); 
	}

	function playAgain() {
		if (isLoadingNextCard) return; // Safety: button should be disabled, but don't act if clicked somehow

		message = '';
		guessString = ''; // Reset guessString
		showConfetti = false;
		guessSubmitted = false; // Ready for a new guess on the new card

		if (data.nextCard && data.nextCardPrice !== null) {
			displayedCard = data.nextCard;
			displayedCardPrice = data.nextCardPrice;
			displayedReleaseDate = data.nextReleaseDate ? new Date(data.nextReleaseDate) : null;
		} else if (data.currentCard) {
			// Fallback: if nextCard isn't ready (e.g. error during its fetch, or end of list),
			// but currentCard is available (perhaps it was re-fetched by invalidateAll if nextCard failed),
			// then use currentCard. This also covers the first click of playAgain if no guess was made yet.
			displayedCard = data.currentCard;
			displayedCardPrice = data.currentCardPrice;
			displayedReleaseDate = data.currentReleaseDate ? new Date(data.currentReleaseDate) : null;
		} else if (data.error) {
            message = data.error;
            feedbackColor = 'text-red-400';
            displayedCard = null; // Clear display if error
        }
		// Note: No invalidateAll() here. The next card data is expected to be ready from checkGuess's invalidateAll.
	}
	
	// Reactive statement to trigger confetti
	$: if (showConfetti && typeof (window as any).confetti === 'function') {
		(window as any).confetti({
			particleCount: 150,
			spread: 100,
			origin: { y: 0.6 }
		});
	}

</script>

<svelte:head>
	<title>Guess the Price</title>
	<meta name="description" content="Play a game to guess the price of Pokémon cards." />
	<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
</svelte:head>

<div class="container mx-auto p-4 flex flex-col items-center">
	<!-- New Page Title Structure -->
	<div class="w-full mx-auto pb-4 lg:pb-5 mb-4 md:mb-8">
		<div class="flex justify-center items-center">
			<PageTitle title="Guess the Price!" />
		</div>
		<div class="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
	</div>

	{#if data.error && !displayedCard}
		<p class="text-red-500 text-xl">{data.error}</p>
		<button 
			on:click={playAgain} 
			class="mt-4 bg-gold-400 hover:bg-gold-500 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
		>
			Try Again
		</button>
	{:else if displayedCard && displayedCardPrice !== null}
		<div class="game-layout-grid w-full grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4 md:gap-8 px-2 sm:px-4">
			<!-- Middle Column (becomes 1st on mobile): Game Box -->
			<div class="card-display-wrapper order-1 md:order-2 w-full flex justify-center">
				<div class="card-display p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl w-full max-w-xs sm:max-w-sm text-center border-2 border-gold-500 relative">
					<h2 class="text-xl sm:text-2xl font-semibold text-gold-300 mb-2">{displayedCard.name}</h2>
					<p class="text-xs sm:text-sm text-gray-400 mb-1">Set: {displayedCard.setName}</p>
					<p class="text-xs sm:text-sm text-gray-400 mb-1">Rarity: {displayedCard.rarity}</p>
					{#if displayedReleaseDate}
						<p class="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Released: {new Date(displayedReleaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
					{:else}
						<p class="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Released: N/A</p> 
					{/if}
					<img src={displayedCard.image} alt={displayedCard.name} class="mx-auto mb-3 sm:mb-4 rounded-lg shadow-md w-48 sm:w-64 h-auto object-contain" />

					<form on:submit|preventDefault={checkGuess} class="w-full">
						<label for="price-guess" class="block text-base sm:text-lg font-medium text-gray-300 mb-1 sm:mb-2">Your Guess ($):</label>
						<input
							type="text" 
							inputmode="numeric"
							id="price-guess"
							name="price-guess"
							bind:value={guessString}
							on:input={handleGuessInput}
							min="0"
							step="1"
							class="shadow appearance-none border border-gold-500 rounded w-full py-2 sm:py-3 px-3 sm:px-4 text-gray-200 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-gold-300 mb-3 sm:mb-4 text-sm sm:text-base"
							placeholder="e.g., 12"
							required
							readonly={guessSubmitted}
						/>
						<button 
							type="submit" 
							class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 sm:py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 text-sm sm:text-base {guessSubmitted ? 'opacity-50 cursor-not-allowed' : ''}"
							disabled={guessSubmitted} 
						>
							Submit Guess
						</button>
					</form>
				</div>
			</div>

			<!-- Left Column (becomes 2nd on mobile): Numpad -->
			<div class="numpad-container order-2 md:order-1 flex justify-center items-center h-full w-full">
				<Numpad onKeyPress={handleNumpadKeyPress} />
			</div>

			<!-- Right Column (becomes 3rd on mobile): Play Again Button and Message -->
			<div class="play-again-message-container order-3 md:order-3 flex flex-col justify-center items-center h-full gap-3 sm:gap-4 w-full">
				{#if message}
					<p class={`text-base sm:text-lg font-semibold text-center ${feedbackColor}`}>{message}</p>
				{/if}
				<button 
					on:click={playAgain} 
					class="play-again-button bg-gold-400 hover:bg-gold-500 text-black font-bold py-2 sm:py-3 px-4 sm:px-6 rounded focus:outline-none focus:shadow-outline transition-all duration-200 text-base sm:text-lg relative { (guessSubmitted && !isLoadingNextCard) ? 'ripple-active' : '' } { isLoadingNextCard ? 'opacity-50' : '' }"
					disabled={isLoadingNextCard || !guessSubmitted}
				>
					<span class="relative z-10">{isLoadingNextCard ? 'Loading Next Card...' : 'Play Again (New Card)'}</span>
				</button>
			</div>
		</div>
	{:else}
		<p class="text-xl text-gray-400">Loading card or no card to display...</p>
		<button 
			on:click={() => { isLoadingNextCard = true; dataSnapshotForLoadingCheck = data; invalidateAll(); }} 
			class="mt-4 bg-gold-400 hover:bg-gold-500 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 {isLoadingNextCard ? 'opacity-50' : ''}"
			disabled={isLoadingNextCard}
		>
			{isLoadingNextCard ? 'Loading...' : 'Refresh'}
		</button>
	{/if}
</div>

<style>
	/* Numpad specific styling can go here or in Numpad.svelte if more complex */
	/* Ensure the grid layout accommodates the numpad */
	.game-layout-grid {
		/* Desktop: grid-template-columns: 1fr auto 1fr; (implicit via md:grid-cols-3) */
		/* Mobile: grid-template-columns: 1fr; (implicit via grid-cols-1) */
	}

	/* Adjust Numpad container for mobile if Numpad itself doesn't scale well */
	@media (max-width: 767px) { /* Below md breakpoint */
		.numpad-container {
			/* Example: could make numpad full width or scale it down */
			/* For now, rely on Numpad internal styling and centering */
			margin-top: 1rem; /* Add some space above numpad on mobile */
			margin-bottom: 1rem; /* Add some space below numpad on mobile */
		}
		.card-display-wrapper {
			/* Ensure it doesn't get too small or too large on mobile */
		}
		.play-again-message-container {
			margin-top: 1rem;
		}
	}

	.play-again-button::before,
	.play-again-button::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 100%; 
		height: 100%;
		display: block;
		transform-origin: center;
		border-radius: inherit; 
		background-color: theme('colors.gold.400'); 
		opacity: 0; /* Start hidden, animation will show it */
		animation-name: ripple_wave_fade_in_out;
    animation-duration: 1.5s;
    animation-timing-function: ease-out;
    animation-iteration-count: infinite;
    animation-play-state: paused; /* Paused by default */
		z-index: 0;
	}

	.play-again-button.ripple-active::before,
	.play-again-button.ripple-active::after {
    animation-play-state: running;
	}

	/* We still need to apply the delay for the second ripple when it's active */
	.play-again-button.ripple-active::after {
		animation-delay: 1.1s;
	}

	/* If not ripple-active, ensure after has no delay or it might jump with a delay when class is added */
	.play-again-button::after {
		animation-delay: 0s; /* Default, overridden by .ripple-active::after */
	}

	@keyframes ripple_wave_fade_in_out { 
		0% {
			transform: translate(-50%, -50%) scale(0);
			opacity: 0; 
		}
		10% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.3;
		}
		40% {
			transform: translate(-50%, -50%) scale(1.2);
			opacity: 0.5; 
		}
		100% {
			transform: translate(-50%, -50%) scale(1.4);
			opacity: 0; 
		}
	}
</style>