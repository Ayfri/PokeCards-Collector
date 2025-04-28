<script lang="ts">
	import type { PageData } from './$types';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import { page } from '$app/state';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import { onMount } from 'svelte';
	import { NO_IMAGES } from '$lib/images';
	// Import icons
	import GiftIcon from 'lucide-svelte/icons/gift';
	import Tag from 'lucide-svelte/icons/tag';
	import Info from 'lucide-svelte/icons/info';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import PokemonIcon from 'lucide-svelte/icons/gamepad-2';
	import SetIcon from 'lucide-svelte/icons/layers';
	import CardIcon from 'lucide-svelte/icons/layout-grid';

	export let data: PageData;
	
	$: latestSet = data.latestSet;
	$: mostExpensiveCards = data.mostExpensiveCards;
	$: stats = data.stats;
	$: sets = data.sets;
	$: pokemons = data.pokemons;
	$: prices = data.prices;

	// Format date
	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	// Format price
	const formatPrice = (price?: number) => {
		if (!price) return 'N/A';
		return `$${price.toFixed(2)}`;
	};
</script>

<main class="container mx-auto px-4 py-8 text-white">
	<!-- Hero section with welcome message -->
	<section class="flex flex-col md:flex-row gap-8 mb-12">
		<div class="flex-1">
			<h1 class="text-3xl md:text-4xl font-bold text-gold-400 mb-4">Welcome to PokéStore</h1>
			<p class="text-gray-300 text-lg mb-6">
				Your ultimate resource for Pokémon TCG cards. Explore our complete collection, track price trends, and manage your personal collection.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
				<div class="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
					{#if !NO_IMAGES}
					<div class="flex justify-center mb-2">
						<CardIcon size={24} class="text-gold-400" />
					</div>
					{/if}
					<span class="text-xl md:text-2xl font-bold text-gold-400">{stats.totalCards}</span>
					<p class="text-sm text-gray-400">Cards</p>
				</div>
				<div class="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
					{#if !NO_IMAGES}
					<div class="flex justify-center mb-2">
						<PokemonIcon size={24} class="text-gold-400" />
					</div>
					{/if}
					<span class="text-xl md:text-2xl font-bold text-gold-400">{stats.uniquePokemon}</span>
					<p class="text-sm text-gray-400">Pokémon</p>
				</div>
				<div class="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
					{#if !NO_IMAGES}
					<div class="flex justify-center mb-2">
						<SetIcon size={24} class="text-gold-400" />
					</div>
					{/if}
					<span class="text-xl md:text-2xl font-bold text-gold-400">{sets.length}</span>
					<p class="text-sm text-gray-400">Sets</p>
				</div>
			</div>
			
			<div class="flex flex-wrap gap-4">
				<a href="/cards-list" class="px-6 py-3 bg-gold-400 hover:bg-gold-500 text-black font-bold rounded-lg transition-colors flex items-center gap-2">
					Explore Cards
					{#if !NO_IMAGES}
					<ArrowRight size={18} />
					{/if}
				</a>
				<a href="/sets" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
					View All Sets
					{#if !NO_IMAGES}
					<SetIcon size={18} />
					{/if}
				</a>
			</div>
		</div>
		
		<div class="flex-1 flex justify-center items-center">
			{#if latestSet && !NO_IMAGES}
				<div class="relative w-full max-w-md transform hover:scale-105 transition-transform duration-300">
					<img src={latestSet.logo} alt="{latestSet.name} logo" class="w-full object-contain mx-auto" />
					<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
						<h3 class="text-xl font-bold text-gold-400">{latestSet.name}</h3>
						<p class="text-sm text-gray-300">Released on {formatDate(latestSet.releaseDate)}</p>
					</div>
				</div>
			{:else if latestSet}
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full">
					<h3 class="text-xl font-bold text-gold-400">{latestSet.name}</h3>
					<p class="text-sm text-gray-300">Released on {formatDate(latestSet.releaseDate)}</p>
				</div>
			{/if}
		</div>
	</section>
	
	<!-- Latest set section -->
	{#if latestSet}
		<section class="mb-12">
			<div class="flex flex-col sm:flex-row justify-between items-center mb-4">
				<a href="/cards-list?set={encodeURIComponent(latestSet.name)}" class="text-gold-400 hover:text-gold-300 transition-colors">
					<h2 class="text-2xl font-bold flex items-center gap-2">
						{#if !NO_IMAGES}
						<GiftIcon size={24} />
						{/if}
						Latest Set: {latestSet.name}
					</h2>
				</a>
				<a href="/cards-list?set={encodeURIComponent(latestSet.name)}" class="text-gold-400 hover:underline flex items-center gap-1">
					View all cards in this set
					{#if !NO_IMAGES}
					<ArrowRight size={16} />
					{/if}
				</a>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg">
					<div class="flex flex-col sm:flex-row gap-6 items-center">
						{#if !NO_IMAGES}
						<img src={latestSet.logo} alt="{latestSet.name} logo" class="w-32 h-32 object-contain" />
						{/if}
						
						<div>
							<h3 class="text-xl font-bold mb-2">{latestSet.name}</h3>
							<p class="text-gray-300 mb-1"><span class="text-gray-400">Release Date:</span> {formatDate(latestSet.releaseDate)}</p>
							<p class="text-gray-300 mb-1"><span class="text-gray-400">Number of Cards:</span> {latestSet.printedTotal}</p>
							{#if latestSet.ptcgoCode}
								<p class="text-gray-300 mb-1"><span class="text-gray-400">PTCGO Code:</span> {latestSet.ptcgoCode}</p>
							{/if}
							{#if latestSet.series}
								<p class="text-gray-300"><span class="text-gray-400">Series:</span> {latestSet.series}</p>
							{/if}
						</div>
					</div>
				</div>
				
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg">
					<h3 class="text-xl font-bold text-gold-400 mb-4 flex items-center gap-2">
						{#if !NO_IMAGES}
						<Info size={20} />
						{/if}
						About This Set
					</h3>
					<p class="text-gray-300 mb-4">
						The {latestSet.name} set is the latest addition to the Pokémon TCG series.
						It features {latestSet.printedTotal} cards, including new Pokémon, trainers, and energy cards.
					</p>
					<p class="text-gray-300">
						Explore the complete collection and discover the rarest and most valuable cards.
					</p>
				</div>
			</div>
		</section>
	{/if}
	
	<!-- Most expensive cards section -->
	{#if mostExpensiveCards && mostExpensiveCards.length > 0}
		<section>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-2xl font-bold text-gold-400 flex items-center gap-2">
					{#if !NO_IMAGES}
					<Tag size={24} />
					{/if}
					Most Valuable Cards in {latestSet.name}
				</h2>
				<a href="/cards-list" class="text-gold-400 hover:underline flex items-center gap-1">
					View all cards
					{#if !NO_IMAGES}
					<ArrowRight size={16} />
					{/if}
				</a>
			</div>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{#each mostExpensiveCards as card, i}
					<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-transparent hover:border-gold-400 flex flex-col">
						<a href="/card/{card.cardCode}" class="block">
							<div class="relative pt-[140%]">
								<CardImage 
									imageUrl={card.image} 
									alt={card.name}
									class="absolute inset-0 w-full h-full object-cover"
									lazy={i > 1}
								/>
							</div>
							
							<div class="p-3">
								<h3 class="font-bold text-sm mb-1 truncate">{card.name}</h3>
								{#if card.rarity}
									<p class="text-xs text-gray-400 mb-1">{card.rarity}</p>
								{/if}
								<p class="text-gold-400 font-bold text-sm">
									{formatPrice(prices[card.cardCode]?.simple || prices[card.cardCode]?.trend)}
								</p>
							</div>
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
