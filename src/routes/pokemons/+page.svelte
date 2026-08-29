<script lang="ts">
	import type { PageData } from './$types';
	import type { PokemonListEntry } from './+page.server';
	import { goto } from '$app/navigation';
	import { pascalCase } from '$helpers/strings';
	import { getPokemonImageSrc, handlePokemonImageError } from '$helpers/pokemon-utils';
	import { NO_IMAGES } from '$lib/images';
	import PageTitle from '@components/PageTitle.svelte';
	import { setNavigationLoading } from '$lib/stores/loading';
	import ScrollToTop from '$lib/components/list/ScrollToTop.svelte';
	import ScrollToBottom from '$lib/components/list/ScrollToBottom.svelte';
	import { fade } from 'svelte/transition';
	import SortControl from '@components/filters/SortControl.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import LayersIcon from "@lucide/svelte/icons/layers";

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let sortBy = $state('pokedex');
	let sortOrder: 'asc' | 'desc' = $state('asc');
	let searchTerm = $state('');

	const sortedPokemons = $derived.by(() => {
		const term = searchTerm.toLowerCase();
		const pokemons = data.pokemons.filter(pokemon => pokemon.name.toLowerCase().includes(term));
		const direction = sortOrder === 'asc' ? 1 : -1;

		const compare: Record<string, (a: PokemonListEntry, b: PokemonListEntry) => number> = {
			cardCount: (a, b) => a.cardCount - b.cardCount,
			name: (a, b) => a.name.localeCompare(b.name),
			pokedex: (a, b) => a.id - b.id,
		};

		return pokemons.sort((a, b) => direction * (compare[sortBy] ?? compare.pokedex)(a, b));
	});

	let hasScrolled = $state(false);
	const scrollThreshold = 100;
	const scrollDuration = 500;

	function navigateToPokemonCard(pokemon: PokemonListEntry) {
		if (!pokemon.cardCode) return;
		setNavigationLoading(true);
		goto(`/card/${pokemon.cardCode}`);
	}

	function smoothScroll(targetPosition: number, duration: number) {
		const startPosition = window.scrollY;
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
		setTimeout(() => { hasScrolled = false; }, scrollDuration);
	}

	function scrollToBottomPage() {
		smoothScroll(document.body.scrollHeight - window.innerHeight, scrollDuration);
	}

	function handleScroll() {
		hasScrolled = window.scrollY > scrollThreshold;
	}
</script>

<svelte:window onscroll={handleScroll} />

<svelte:head>
	<title>All Pokémons | PokéCards Collector</title>
	<meta name="description" content="Browse all Pokémons and their cards." />
</svelte:head>

<div class="container mx-auto px-4 py-8 text-white">
	<div class="flex justify-between items-center mb-4">
		<div class="shrink-0">
			<PageTitle title="All Pokémons" />
		</div>
		<div class="flex items-end gap-4">
			<TextInput
				id="pokemon-search"
				label="Search Pokémon"
				labelClass="sr-only"
				bind:value={searchTerm}
				placeholder="Search Pokémon..."
			/>
			<SortControl
				bind:sortValue={sortBy}
				bind:sortDirection={sortOrder}
				options={[
					{ value: 'pokedex', label: 'Pokédex #' },
					{ value: 'name', label: 'Name' },
					{ value: 'cardCount', label: 'Card Count' }
				]}
			/>
		</div>
	</div>
	<div class="w-full max-w-[800px] mx-auto my-6 h-1 bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>

	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-8 align-items-start align-content-start">
		{#each sortedPokemons as pokemon (pokemon.id)}
			<button
				onclick={() => navigateToPokemonCard(pokemon)}
				class="group bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-hidden focus:ring-2 focus:ring-gold-400/75 p-3 flex flex-col items-center text-center border border-transparent hover:border-gold-400 [content-visibility:auto] [contain-intrinsic-size:auto_11rem]"
				title={`View the most valuable ${pascalCase(pokemon.name)} card`}
			>
				<div class="relative w-24 h-24 md:w-28 md:h-28 mb-2">
					{#if !NO_IMAGES}
						<img
							src={getPokemonImageSrc(pokemon.id)}
							alt={pascalCase(pokemon.name)}
							class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 ease-in-out"
							onerror={(e) => handlePokemonImageError(e, pokemon.id, pokemon.fallbackImage)}
							decoding="async"
							height="112"
							loading="lazy"
							width="112"
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
				<span class="text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">
					{pascalCase(pokemon.name)}
				</span>
				<span class="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-1" title="Cards featuring this Pokémon">
					<LayersIcon size={12} />
					{pokemon.cardCount} card{pokemon.cardCount === 1 ? '' : 's'}
				</span>
			</button>
		{/each}
	</div>
</div>

{#if hasScrolled}
	<div transition:fade={{ duration: 300 }}>
		<ScrollToTop onclick={scrollToTopPage} />
	</div>
{/if}
<ScrollToBottom onclick={scrollToBottomPage} />
