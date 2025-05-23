<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { pascalCase } from '$helpers/strings';
	import { getPokemonImageSrc, handlePokemonImageError, getMostExpensiveCardForPokemon } from '$lib/helpers/pokemon-utils';
	import { NO_IMAGES } from '$lib/images';
	import PageTitle from '@components/PageTitle.svelte';
	import type { Pokemon, FullCard } from '$lib/types';
	import { setNavigationLoading } from '$lib/stores/loading';
	import ScrollToTop from '$lib/components/list/ScrollToTop.svelte';
	import ScrollToBottom from '$lib/components/list/ScrollToBottom.svelte';
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import SortControl from '@components/filters/SortControl.svelte';

	export let data: PageData;

	const { pokemons: initialPokemons, allCards, prices } = data;

	// Sorting state
	let sortBy = 'pokedex'; // Default sort by Pokedex number
	let sortOrder: 'asc' | 'desc' = 'asc'; // Default sort order ascending

	let sortedPokemons: Pokemon[] = [];

	// Reactive statement to sort pokemons
	$: {
		let tempPokemons = [...initialPokemons];
		if (sortBy === 'pokedex') {
			tempPokemons.sort((a, b) => {
				return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
			});
		} else if (sortBy === 'name') {
			tempPokemons.sort((a, b) => {
				const nameA = a.name.toLowerCase();
				const nameB = b.name.toLowerCase();
				if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
				if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
				return 0;
			});
		}
		sortedPokemons = tempPokemons;
	}

	let hasScrolled = false;
	const scrollThreshold = 100; // Pixels to scroll before showing ScrollToTop
	const scrollDuration = 500; // Milliseconds for smooth scroll

	function navigateToPokemonCard(pokemon: Pokemon) {
		setNavigationLoading(true);
		const mostExpensiveCard = getMostExpensiveCardForPokemon(pokemon.id, allCards, prices);
		if (mostExpensiveCard) {
			goto(`/card/${mostExpensiveCard.cardCode}`);
		} else {
			console.error(`No card found for ${pokemon.name}`);
			setNavigationLoading(false);
		}
	}

	function smoothScroll(targetPosition: number, duration: number) {
		const startPosition = window.pageYOffset;
		const distance = targetPosition - startPosition;
		let startTime: number | null = null;

		function scrollStep(timestamp: number) {
			if (!startTime) startTime = timestamp;
			const timeElapsed = timestamp - startTime;
			const progress = Math.min(timeElapsed / duration, 1);
			const easeInOutCubic = (p: number) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

			window.scrollTo(0, startPosition + distance * easeInOutCubic(progress));

			if (timeElapsed < duration) {
				window.requestAnimationFrame(scrollStep);
			} else {
				window.scrollTo(0, targetPosition);
			}
		}
		window.requestAnimationFrame(scrollStep);
	}

	function scrollToTopPage() {
		smoothScroll(0, scrollDuration);
		setTimeout(() => { hasScrolled = false; }, scrollDuration); // Hide button after scroll
	}

	function scrollToBottomPage() {
		const targetPosition = document.body.scrollHeight - window.innerHeight;
		smoothScroll(targetPosition, scrollDuration);
	}

	function handleScroll() {
		if (window.pageYOffset > scrollThreshold) {
			hasScrolled = true;
		} else {
			hasScrolled = false;
		}
	}

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

</script>

<svelte:head>
	<title>All Pokémons | PokéCards Collector</title>
	<meta name="description" content="Browse all Pokémons and their cards." />
</svelte:head>

<div class="container mx-auto px-4 py-8 text-white">
	<div class="flex justify-between items-center mb-4">
		<div class="flex-shrink-0">
			<PageTitle title="All Pokémons" />
		</div>
		<div class="flex items-center gap-4">
			<SortControl
				bind:sortValue={sortBy}
				bind:sortDirection={sortOrder}
				options={[
					{ value: 'pokedex', label: 'Pokédex #' },
					{ value: 'name', label: 'Name' }
				]}
			/>
		</div>
	</div>
	<div class="w-full max-w-[800px] mx-auto my-6 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>

	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-8 min-h-[calc(100vh-200px)]">
		{#each sortedPokemons as pokemon (pokemon.id)}
			<button
				on:click={() => navigateToPokemonCard(pokemon)}
				class="pokemon-card-item group bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-opacity-75 p-3 flex flex-col items-center text-center"
			>
				<div class="image-container relative w-24 h-24 md:w-28 md:h-28 mb-2">
					{#if !NO_IMAGES}
						<img
							src={getPokemonImageSrc(pokemon.id)}
							alt={pascalCase(pokemon.name)}
							class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 ease-in-out"
							on:error={(e) => handlePokemonImageError(e, pokemon.id, allCards)} 
							loading="lazy"
						/>
					{:else}
						<div class="w-full h-full flex items-center justify-center text-white text-sm bg-gray-700 rounded-md">
							#{pokemon.id}
						</div>
					{/if}
					<div class="absolute -top-1.5 -right-1.5 bg-gray-700 text-gold-400 text-xs font-bold rounded-full size-7 flex items-center justify-center shadow-md border border-gold-400/50">
						{pokemon.id}
					</div>
				</div>
				<span class="pokemon-name text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">
					{pascalCase(pokemon.name)}
				</span>
			</button>
		{/each}
	</div>
</div>

{#if hasScrolled}
	<div transition:fade={{ duration: 300 }}>
		<ScrollToTop on:click={scrollToTopPage} />
	</div>
{/if}
<ScrollToBottom on:click={scrollToBottomPage} />

<style lang="postcss">
	.pokemon-card-item {
		border: 1px solid transparent;
	}
	.pokemon-card-item:hover {
		border-color: theme(colors.gold.400);
	}
</style> 