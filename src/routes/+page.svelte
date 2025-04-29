<script lang="ts">
	import type { PageData } from "./$types";
	import type { FullCard } from "$lib/types";
	import CardImage from "$lib/components/card/CardImage.svelte";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import { NO_IMAGES } from "$lib/images";
	import { fly, fade } from 'svelte/transition';
	import CountUp from '$lib/components/ui/CountUp.svelte';
	// Import icons
	import GiftIcon from "lucide-svelte/icons/gift";
	import Tag from "lucide-svelte/icons/tag";
	import ArrowRight from "lucide-svelte/icons/arrow-right";
	import PokemonIcon from "lucide-svelte/icons/gamepad-2";
	import SetIcon from "lucide-svelte/icons/layers";
	import CardIcon from "lucide-svelte/icons/layout-grid";
	import PaintbrushIcon from "lucide-svelte/icons/paintbrush";
	import ChartIcon from "lucide-svelte/icons/bar-chart-3";
	import HeartIcon from 'lucide-svelte/icons/heart';
	import SearchIcon from 'lucide-svelte/icons/search';
	import BookOpenCheckIcon from 'lucide-svelte/icons/book-open-check';
	import LogInIcon from 'lucide-svelte/icons/log-in';
	import UserPlusIcon from 'lucide-svelte/icons/user-plus';

	import { getArtists } from "$helpers/data";
	import { ChevronLeft, ChevronRight } from "lucide-svelte";

	export let data: PageData;

	$: latestSet = data.latestSet;
	$: mostExpensiveLatestSetCards = data.mostExpensiveLatestSetCards;
	$: mostExpensiveCards = data.mostExpensiveCards;
	$: stats = data.stats;
	$: sets = data.sets;
	$: prices = data.prices;
	$: session = page.data.session;

	// Récupérer les données des cartes de la page.server.ts
	$: allCards = data.allCards || [];

	// Calculer les statistiques du dernier set
	$: latestSetCards = latestSet ? allCards.filter((card: FullCard) => card.setName?.toLowerCase() === latestSet.name.toLowerCase()) : [];

	$: latestSetPokemonCards = latestSetCards.filter((card: FullCard) => card.supertype === "Pokémon");
	$: latestSetTrainerCards = latestSetCards.filter((card: FullCard) => card.supertype === "Trainer");
	$: latestSetEnergyCards = latestSetCards.filter((card: FullCard) => card.supertype === "Energy");

	// Calculer la valeur totale du set
	$: totalSetValue = latestSetCards.reduce((sum: number, card: FullCard) => sum + (prices[card.cardCode]?.simple || 0), 0);

	// Artists count
	let artistsCount = 0;
	onMount(async () => {
		try {
			const artists = await getArtists();
			artistsCount = artists.length;
		} catch (error) {
			console.error("Failed to load artists count:", error);
		}
	});

	// Format date
	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Format price
	const formatPrice = (price?: number) => {
		if (!price) return "N/A";
		return `$${price.toFixed(2)}`;
	};

	// Animation for chevrons
	const bounceAnimation = {
		duration: 1000,
		iterationCount: 'infinite',
		direction: 'alternate',
		easing: 'cubic-bezier(0.5, 0, 0.5, 1)'
	};

	let ready = false;
	onMount(() => {
		ready = true;
	});
</script>

<main class="container mx-auto px-4 py-8 text-white overflow-x-hidden">
	<!-- Hero section with welcome message -->
	{#if ready}
		<section class="flex flex-col md:flex-row gap-8 mb-12" in:fly={{ y: 20, duration: 500, delay: 100 }} out:fade={{ duration: 200 }}>
			<div class="flex-1">
				<h1 class="text-3xl md:text-4xl font-bold text-gold-400 mb-4">Welcome to PokéStore</h1>
				<p class="text-gray-300 text-lg mb-6">
					Your ultimate resource for Pokémon TCG cards. Explore our complete collection, track price trends, and manage your personal
					collection.
				</p>

				<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
					<a
						href="/cards-list"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px] overflow-visible"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<CardIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<ChevronRight size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<span class="text-xl md:text-2xl font-bold text-gold-400">
							<CountUp end={stats.totalCards} duration={4} />
						</span>
						<ChevronLeft size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<p class="text-sm text-gray-400">Cards</p>
					</a>
					<a
						href="/cards-list?type=pokemon"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<PokemonIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<ChevronRight size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<span class="text-xl md:text-2xl font-bold text-gold-400">
							<CountUp end={stats.uniquePokemon} duration={3.5} />
						</span>
						<ChevronLeft size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<p class="text-sm text-gray-400">Pokémon</p>
					</a>
					<a
						href="/sets"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<SetIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<ChevronRight size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<span class="text-xl md:text-2xl font-bold text-gold-400">
							<CountUp end={sets.length} duration={2} />
						</span>
						<ChevronLeft size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<p class="text-sm text-gray-400">Sets</p>
					</a>
					<a
						href="/artists"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<PaintbrushIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<ChevronRight size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<span class="text-xl md:text-2xl font-bold text-gold-400">
							<CountUp end={artistsCount} duration={2.5} />
						</span>
						<ChevronLeft size={16} class="text-gold-400" style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}" />
						<p class="text-sm text-gray-400">Artists</p>
					</a>
				</div>

				<div class="flex flex-wrap gap-4">
					<a
						href="/cards-list"
						class="group px-6 py-3 bg-gold-400 text-black font-bold rounded-lg transition-all duration-[400ms] flex items-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900"
					>
						Explore Cards
						{#if !NO_IMAGES}
							<ArrowRight size={18} class="group-hover:translate-x-1 transition-all duration-[400ms]" />
						{/if}
					</a>
				</div>
			</div>

			<div class="flex-1 flex justify-center items-center">
				{#if latestSet}
					<a
						href="/cards-list?set={encodeURIComponent(latestSet.name)}"
						class="relative w-full max-w-md transform transition-all duration-300 hover:scale-105"
					>
						{#if !NO_IMAGES}
							<img src={latestSet.logo} alt="{latestSet.name} logo" class="w-full object-contain mx-auto" />
						{/if}
						<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
							<h3 class="text-xl font-bold text-gold-400">{latestSet.name}</h3>
							<p class="text-sm text-gray-300">Released on {formatDate(latestSet.releaseDate)}</p>
						</div>
					</a>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Separator after hero section -->
	<div class="w-full max-w-[800px] mx-auto my-8 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" class:hidden={!ready}></div>

	<!-- Latest set section -->
	{#if latestSet && ready}
		<section class="mb-12" in:fly={{ y: 20, duration: 500, delay: 200 }} out:fade={{ duration: 200 }}>
			<div class="flex flex-col sm:flex-row justify-between items-center mb-4">
				<a href="/cards-list?set={encodeURIComponent(latestSet.name)}" class="text-gold-400 hover:text-gold-300 transition-colors">
					<h2 class="text-2xl font-bold flex items-center gap-2">
						{#if !NO_IMAGES}
							<GiftIcon size={24} />
						{/if}
						Latest Set: {latestSet.name}
					</h2>
				</a>
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="text-gold-400 hover:underline flex items-center gap-1"
				>
					View all cards in this set
					{#if !NO_IMAGES}
						<ArrowRight size={16} />
					{/if}
				</a>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="block bg-gray-800 p-6 rounded-lg shadow-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
				>
					<div class="flex flex-col sm:flex-row gap-6 items-center">
						{#if !NO_IMAGES}
							<img src={latestSet.logo} alt="{latestSet.name} logo" class="w-32 h-32 object-contain" />
						{/if}

						<div>
							<h3 class="text-xl font-bold mb-2">{latestSet.name}</h3>
							<p class="text-gray-300 mb-1">
								<span class="text-gray-400">Release Date:</span>
								{formatDate(latestSet.releaseDate)}
							</p>
							<p class="text-gray-300 mb-1"><span class="text-gray-400">Number of Cards:</span> {latestSet.printedTotal}</p>
							{#if latestSet.ptcgoCode}
								<p class="text-gray-300 mb-1"><span class="text-gray-400">PTCGO Code:</span> {latestSet.ptcgoCode}</p>
							{/if}
							{#if latestSet.series}
								<p class="text-gray-300"><span class="text-gray-400">Series:</span> {latestSet.series}</p>
							{/if}
						</div>
					</div>
				</a>

				<div
					class="block bg-gray-800 p-6 rounded-lg shadow-lg transition-colors border border-transparent"
				>
					<h3 class="text-xl font-bold text-gold-400 mb-4 flex items-center gap-2">
						{#if !NO_IMAGES}
							<ChartIcon size={20} class="text-gold-400" />
						{/if}
						Set Statistics
					</h3>

					<div class="grid grid-cols-3 gap-4 mb-4">
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp end={latestSetPokemonCards.length} duration={3} />
							</p>
							<p class="text-xs text-gray-300">Pokémon Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp end={latestSetTrainerCards.length} duration={2} />
							</p>
							<p class="text-xs text-gray-300">Trainer Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp end={latestSetEnergyCards.length} duration={2} />
							</p>
							<p class="text-xs text-gray-300">Energy Cards</p>
						</div>
					</div>

					<div>
						<p class="text-sm text-gray-300">
							<span class="text-gray-400">Completion value:</span>
							<span class="text-gold-400">
								<CountUp end={totalSetValue} duration={2} options={{decimalPlaces: 2, prefix: "$"}} />
							</span>
						</p>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Separator before Most Expensive Cards section -->
	<div class="w-full max-w-[200px] mx-auto my-6 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" class:hidden={!ready}></div>

	<!-- Most expensive cards latest set section -->
	{#if mostExpensiveLatestSetCards && mostExpensiveLatestSetCards.length > 0 && ready}
		<section in:fly={{ y: 20, duration: 500, delay: 300 }} out:fade={{ duration: 200 }}>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-2xl font-bold text-gold-400 flex items-center gap-2">
					{#if !NO_IMAGES}
						<Tag size={24} />
					{/if}
					Most Valuable Cards in {latestSet.name}
				</h2>
				<a href="/cards-list?set={encodeURIComponent(latestSet.name)}" class="text-gold-400 hover:underline flex items-center gap-1">
					View all cards
					{#if !NO_IMAGES}
						<ArrowRight size={16} />
					{/if}
				</a>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{#each mostExpensiveLatestSetCards as card, i}
					<div
						class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-transparent hover:border-gold-400 flex flex-col"
					>
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

	<!-- Most expensive cards section -->
	{#if mostExpensiveCards && mostExpensiveCards.length > 0 && ready}
		<section class="mt-12" in:fly={{ y: 20, duration: 500, delay: 300 }} out:fade={{ duration: 200 }}>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-2xl font-bold text-gold-400 flex items-center gap-2">
					{#if !NO_IMAGES}
						<Tag size={24} />
					{/if}
					Most Valuable Cards
				</h2>
				<a href="/cards-list?mostexpensive=true&sortby=sort-price" class="text-gold-400 hover:underline flex items-center gap-1">
					View all cards
					{#if !NO_IMAGES}
						<ArrowRight size={16} />
					{/if}
				</a>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{#each mostExpensiveCards as card, i}
					<div
						class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-transparent hover:border-gold-400 flex flex-col"
					>
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

	<!-- Separator -->
	<div class="w-full max-w-[800px] mx-auto my-12 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" class:hidden={!ready}></div>

	<!-- Feature Highlights Section -->
	{#if ready}
		<section class="mb-12" in:fly={{ y: 30, duration: 600, delay: 400 }} out:fade={{ duration: 200 }}>
			<h2 class="text-2xl md:text-3xl font-bold text-center text-gold-400 mb-8">Discover PokéStore Features</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all transform hover:-translate-y-1">
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<BookOpenCheckIcon size={40} class="text-gold-400" />
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">Manage Collection</h3>
					<p class="text-gray-400">Keep track of every card you own, organized by set and rarity.</p>
					<a href="/collection" class="text-gold-400 hover:underline mt-4 inline-block">My Collection</a>
				</div>
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all transform hover:-translate-y-1">
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<HeartIcon size={40} class="text-gold-400" />
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">Build Wishlist</h3>
					<p class="text-gray-400">Curate a list of cards you desire to complete your collection goals.</p>
					<a href="/wishlist" class="text-gold-400 hover:underline mt-4 inline-block">My Wishlist</a>
				</div>
				<div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all transform hover:-translate-y-1">
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<SearchIcon size={40} class="text-gold-400" />
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">Explore & Search</h3>
					<p class="text-gray-400">Easily search and filter through thousands of cards and sets.</p>
					<a href="/cards-list" class="text-gold-400 hover:underline mt-4 inline-block">Find Cards</a>
				</div>
			</div>
		</section>
	{/if}

	<!-- Separator -->
	<div class="w-full max-w-[200px] mx-auto my-12 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" class:hidden={!ready}></div>

	<!-- Call to Action Section -->
	{#if ready}
		<section class="text-center bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-lg shadow-xl mb-12 border border-gold-600/30" in:fade={{ duration: 700, delay: 500 }} out:fade={{ duration: 200 }}>
			{#if session}
				<h2 class="text-2xl md:text-3xl font-bold text-gold-400 mb-4">Welcome back, {session.user.email}!</h2>
				<p class="text-gray-300 text-lg mb-6">Ready to manage your collection or check your wishlist?</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a href="/collection" class="px-6 py-3 bg-gold-400 hover:bg-gold-500 text-black font-bold rounded-lg transition-colors flex items-center gap-2">
						Go to Collection
						{#if !NO_IMAGES}
							<BookOpenCheckIcon size={18} />
						{/if}
					</a>
					<a href="/wishlist" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
						View Wishlist
						{#if !NO_IMAGES}
							<HeartIcon size={18} />
						{/if}
					</a>
				</div>
			{:else}
				<h2 class="text-2xl md:text-3xl font-bold text-gold-400 mb-4">Join PokéStore Today!</h2>
				<p class="text-gray-300 text-lg mb-6">Sign up or log in to start managing your Pokémon card collection and wishlist.</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a href="/login" class="px-6 py-3 bg-gold-400 hover:bg-gold-500 text-black font-bold rounded-lg transition-colors flex items-center gap-2">
						Log In
						{#if !NO_IMAGES}<LogInIcon size={18} />{/if}
					</a>
					<a href="/signup" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
						Sign Up
						{#if !NO_IMAGES}
							<UserPlusIcon size={18} />
						{/if}
					</a>
				</div>
			{/if}
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
