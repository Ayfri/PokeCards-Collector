<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { Card } from '$lib/types'; // Assuming Card type is needed for local state
	import Numpad from '$lib/components/Numpad.svelte'; // Import Numpad

	export let data: PageData;

	// Local state for the currently displayed card details
	let displayedCard: Card | null = null;
	let displayedCardPrice: number | null = null;
	let displayedReleaseDate: Date | null = null;

	let guessString: string = ''; // Changed from guess: number | null
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
			if (!guessString.includes('.')) {
				guessString += key;
			}
		} else { // Digit
			// Limit to 2 decimal places
			const parts = guessString.split('.');
			if (parts.length === 2 && parts[1].length >= 2) {
				return;
			}
			guessString += key;
		}
	}

	function checkGuess() {
		const guess = parseFloat(guessString);
		if (isNaN(guess)) {
			message = 'Please enter a valid price.';
			feedbackColor = 'text-red-400';
			return;
		}

		guessSubmitted = true;
		isLoadingNextCard = true;
		dataSnapshotForLoadingCheck = data;

		const actualPrice = displayedCardPrice;

		if (actualPrice === null) { // Should not happen if displayedCard is present
			message = 'Error: Card price is not available.';
			feedbackColor = 'text-red-400';
			isLoadingNextCard = false;
			return;
		}

		const difference = Math.abs(guess - actualPrice);
		const percentageDifference = actualPrice > 0 ? (difference / actualPrice) * 100 : Infinity;

		if (guess === actualPrice) {
			message = `Correct! The price was ${actualPrice.toFixed(2)}$! You're a Pokémon Master!`;
			feedbackColor = 'text-green-400';
			showConfetti = true;
		} else {
			showConfetti = false;
			const priceRevealed = `The correct price was ${actualPrice.toFixed(2)}$.`;
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
	<h1 class="text-4xl font-bold text-center text-gold-400 mb-8">Guess the Price!</h1>

	{#if data.error && !displayedCard}
		<p class="text-red-500 text-xl">{data.error}</p>
		<button 
			on:click={playAgain} 
			class="mt-4 bg-gold-400 hover:bg-gold-500 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
		>
			Try Again
		</button>
	{:else if displayedCard && displayedCardPrice !== null}
		<div class="game-layout-grid w-full grid items-center gap-4 md:gap-8 px-4" style="grid-template-columns: 1fr auto 1fr;">
			<!-- Left Column: Numpad -->
			<div class="numpad-container flex justify-center items-center h-full">
				<Numpad onKeyPress={handleNumpadKeyPress} />
			</div>

			<!-- Middle Column: Game Box -->
			<div class="card-display-wrapper">
				<div class="card-display p-6 bg-gray-800 rounded-lg shadow-xl w-full max-w-sm text-center border-2 border-gold-500 relative">
					<h2 class="text-2xl font-semibold text-gold-300 mb-2">{displayedCard.name}</h2>
					<p class="text-sm text-gray-400 mb-1">Set: {displayedCard.setName}</p>
					<p class="text-sm text-gray-400 mb-1">Rarity: {displayedCard.rarity}</p>
					{#if displayedReleaseDate}
						<p class="text-sm text-gray-400 mb-4">Released: {new Date(displayedReleaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
					{:else}
						<p class="text-sm text-gray-400 mb-4">Released: N/A</p> 
					{/if}
					<img src={displayedCard.image} alt={displayedCard.name} class="mx-auto mb-4 rounded-lg shadow-md w-64 h-auto object-contain" />

					<form on:submit|preventDefault={checkGuess} class="w-full">
						<label for="price-guess" class="block text-lg font-medium text-gray-300 mb-2">Your Guess ($):</label>
						<input
							type="text" 
							inputmode="decimal"
							id="price-guess"
							name="price-guess"
							bind:value={guessString}
							min="0"
							step="0.01"
							class="shadow appearance-none border border-gold-500 rounded w-full py-3 px-4 text-gray-200 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-gold-300 mb-4"
							placeholder="e.g., 12.50"
							required
							readonly={guessSubmitted}
						/>
						<button 
							type="submit" 
							class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 {guessSubmitted ? 'opacity-50 cursor-not-allowed' : ''}"
							disabled={guessSubmitted} 
						>
							Submit Guess
						</button>
					</form>

					{#if message}
						<p class={`mt-4 text-lg font-semibold ${feedbackColor}`}>{message}</p>
					{/if}
				</div>
			</div>

			<!-- Right Column: Play Again Button -->
			<div class="play-again-button-container flex justify-center items-center h-full">
				<button 
					on:click={playAgain} 
					class="play-again-button bg-gold-400 hover:bg-gold-500 text-black font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline transition-all duration-200 text-lg relative { (guessSubmitted && !isLoadingNextCard) ? 'ripple-active' : '' } { isLoadingNextCard ? 'opacity-50' : '' }"
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
		/* Adjust grid-template-columns if numpad causes overflow or alignment issues */
		/* Example: grid-template-columns: minmax(auto, 220px) auto minmax(auto, 220px); */
		/* The current 1fr auto 1fr might be fine if numpad fits well */
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