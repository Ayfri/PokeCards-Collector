<script lang="ts">
	import type { PageData } from "./$types";
	import type { FullCard } from "$lib/types";
	import CardImage from "@components/card/CardImage.svelte";
	import CountUp from "@components/ui/CountUp.svelte";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import { NO_IMAGES } from "$lib/images";
	import { fly, fade } from "svelte/transition";
	import { getArtists } from "$helpers/data";
	import { ChevronLeft, ChevronRight } from "lucide-svelte";
	// Import icons
	import GiftIcon from "lucide-svelte/icons/gift";
	import Tag from "lucide-svelte/icons/tag";
	import ArrowRight from "lucide-svelte/icons/arrow-right";
	import PokemonIcon from "lucide-svelte/icons/gamepad-2";
	import SetIcon from "lucide-svelte/icons/layers";
	import CardIcon from "lucide-svelte/icons/layout-grid";
	import PaintbrushIcon from "lucide-svelte/icons/paintbrush";
	import ChartIcon from "lucide-svelte/icons/bar-chart-3";
	import HeartIcon from "lucide-svelte/icons/heart";
	import SearchIcon from "lucide-svelte/icons/search";
	import BookOpenCheckIcon from "lucide-svelte/icons/book-open-check";
	import LogInIcon from "lucide-svelte/icons/log-in";
	import UserPlusIcon from "lucide-svelte/icons/user-plus";
	import GridIcon from "lucide-svelte/icons/layout-grid";
	import GlobeIcon from "lucide-svelte/icons/globe";
	import AuthModal from '@components/auth/AuthModal.svelte';

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
	$: latestSetCards = latestSet
		? allCards.filter(
				(card: FullCard) =>
					card.setName?.toLowerCase() ===
					latestSet.name.toLowerCase(),
			)
		: [];

	$: latestSetPokemonCards = latestSetCards.filter(
		(card: FullCard) => card.supertype === "Pokémon",
	);
	$: latestSetTrainerCards = latestSetCards.filter(
		(card: FullCard) => card.supertype === "Trainer",
	);
	$: latestSetEnergyCards = latestSetCards.filter(
		(card: FullCard) => card.supertype === "Energy",
	);

	// Calculer la valeur totale du set
	$: totalSetValue = latestSetCards.reduce(
		(sum: number, card: FullCard) =>
			sum + (prices[card.cardCode]?.simple || 0),
		0,
	);

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
		iterationCount: "infinite",
		direction: "alternate",
		easing: "cubic-bezier(0.5, 0, 0.5, 1)",
	};

	let ready = false;
	onMount(() => {
		ready = true;
	});

	let isAuthModalOpen = false;
	function openAuthModal() { isAuthModalOpen = true; }
	function closeAuthModal() { isAuthModalOpen = false; }
</script>

<main class="container mx-auto px-4 py-8 text-white overflow-x-hidden">
	<!-- Hero section with welcome message -->
	{#if ready}
		<section
			class="flex flex-col md:flex-row gap-8 mb-20"
			in:fly={{ y: 20, duration: 500, delay: 100 }}
			out:fade={{ duration: 200 }}
		>
			<div class="flex-1">
				<h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-balance text-gold-400">
					Welcome to PokéCards-Collector
				</h1>
				<p class="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl text-pretty">
					Your ultimate resource for Pokémon TCG cards. Explore our
					complete collection, track price trends, and manage your
					personal collection.
				</p>

				<div class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
					<a
						href="/cards-list"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px] overflow-hidden"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<CardIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<div
							class="flex items-center justify-center w-full"
						>
							<ChevronRight
								size={12}
								class="text-gold-400 flex-shrink-0 mr-1"
								style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
							<span
								class="text-xl md:text-2xl font-bold text-gold-400"
							>
								<CountUp end={stats.totalCards} duration={4} />
							</span>
							<ChevronLeft
								size={12}
								class="text-gold-400 flex-shrink-0 ml-1"
								style="animation: bounceLeft {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
						</div>
						<p class="text-sm text-gray-400">Cards</p>
					</a>
					<a
						href="/japan"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px] overflow-hidden"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<GlobeIcon size={24} class="text-gold-400" />
							</div>
						{/if}
						<div
							class="flex items-center justify-center w-full"
						>
							<ChevronRight
								size={12}
								class="text-gold-400 flex-shrink-0 mr-1"
								style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
							<span
								class="text-xl md:text-2xl font-bold text-gold-400"
							>
								<CountUp end={23308} duration={4} />
							</span>
							<ChevronLeft
								size={12}
								class="text-gold-400 flex-shrink-0 ml-1"
								style="animation: bounceLeft {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
						</div>
						<p class="text-sm text-gray-400">JP Cards</p>
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
						<div
							class="flex items-center justify-center w-full"
						>
							<ChevronRight
								size={12}
								class="text-gold-400 flex-shrink-0 mr-1"
								style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
							<span
								class="text-xl md:text-2xl font-bold text-gold-400"
							>
								<CountUp
									end={stats.uniquePokemon}
									duration={3.5}
								/>
							</span>
							<ChevronLeft
								size={12}
								class="text-gold-400 flex-shrink-0 ml-1"
								style="animation: bounceLeft {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
						</div>
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
						<div
							class="flex items-center justify-center w-full"
						>
							<ChevronRight
								size={12}
								class="text-gold-400 flex-shrink-0 mr-1"
								style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
							<span
								class="text-xl md:text-2xl font-bold text-gold-400"
							>
								<CountUp end={sets.length} duration={2} />
							</span>
							<ChevronLeft
								size={12}
								class="text-gold-400 flex-shrink-0 ml-1"
								style="animation: bounceLeft {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
						</div>
						<p class="text-sm text-gray-400">Sets</p>
					</a>
					<a
						href="/artists"
						class="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
					>
						{#if !NO_IMAGES}
							<div class="flex justify-center mb-2">
								<PaintbrushIcon
									size={24}
									class="text-gold-400"
								/>
							</div>
						{/if}
						<div
							class="flex items-center justify-center w-full"
						>
							<ChevronRight
								size={12}
								class="text-gold-400 flex-shrink-0 mr-1"
								style="animation: bounceRight {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
							<span
								class="text-xl md:text-2xl font-bold text-gold-400"
							>
								<CountUp end={artistsCount} duration={2.5} />
							</span>
							<ChevronLeft
								size={12}
								class="text-gold-400 flex-shrink-0 ml-1"
								style="animation: bounceLeft {bounceAnimation.duration}ms {bounceAnimation.easing} {bounceAnimation.iterationCount} {bounceAnimation.direction}"
							/>
						</div>
						<p class="text-sm text-gray-400">Artists</p>
					</a>
				</div>

				<div class="flex flex-wrap gap-4 mb-10 md:mb-0">
					<a
						href="/cards-list"
						class="group px-6 py-3 bg-gold-400 text-black font-bold rounded-lg transition-all duration-[400ms] flex items-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900"
					>
						Explore Cards
						<ArrowRight
							size={18}
							class="group-hover:translate-x-1 transition-all duration-[400ms]"
						/>
					</a>
				</div>
			</div>

			<div class="flex-1 flex justify-center items-center mt-8 lg:mt-0">
				{#if latestSet}
					<a
						href="/cards-list?set={encodeURIComponent(
							latestSet.name,
						)}"
						class="relative w-full max-w-lg transform transition-all duration-300 hover:scale-105 block"
					>
						{#if !NO_IMAGES}
							<img
								src={latestSet.logo}
								alt="{latestSet.name} logo"
								class="w-[95%] mb-2 object-contain mx-auto rounded-lg shadow-md"
							/>
						{/if}
						<div
							class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent p-4 rounded-b-2xl"
						>
							<h3
								class="text-xl font-bold text-gold-400 w-fit drop-shadow-[0_0_7px_black]"
							>
								{latestSet.name}
							</h3>
							<p
								class="text-sm text-gray-300 w-fit drop-shadow-[0_0_7px_black]"
							>
								Released on {formatDate(latestSet.releaseDate)}
							</p>
						</div>
					</a>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Separator after hero section -->
	<div
		class="w-full max-w-[800px] mx-auto my-16 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"
		class:hidden={!ready}
	></div>

	<!-- Latest set section -->
	{#if latestSet && ready}
		<section
			class="mb-20"
			in:fly={{ y: 20, duration: 500, delay: 200 }}
			out:fade={{ duration: 200 }}
		>
			<div
				class="flex flex-col sm:flex-row justify-between items-center mb-8"
			>
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="text-gold-400 hover:text-gold-300 transition-colors"
				>
					<h2 class="text-2xl font-bold flex items-center gap-2">
						{#if !NO_IMAGES}
							<GiftIcon size={24} />
						{/if}
						Latest Set: {latestSet.name}
					</h2>
				</a>
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="text-gold-400 hover:underline flex items-center gap-1 group"
				>
					View all cards in this set
					<ArrowRight
						size={16}
						class="group-hover:translate-x-1 transition-all duration-[400ms]"
					/>
				</a>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="block bg-gray-800 p-6 rounded-lg shadow-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
				>
					<div class="flex flex-col sm:flex-row gap-6 items-center">
						{#if !NO_IMAGES}
							<img
								src={latestSet.logo}
								alt="{latestSet.name} logo"
								class="w-32 h-32 object-contain"
							/>
						{/if}

						<div>
							<h3 class="text-xl font-bold mb-2">
								{latestSet.name}
							</h3>
							<p class="text-gray-300 mb-1">
								<span class="text-gray-400">Release Date:</span>
								{formatDate(latestSet.releaseDate)}
							</p>
							<p class="text-gray-300 mb-1">
								<span class="text-gray-400"
									>Number of Cards:</span
								>
								{latestSet.printedTotal}
							</p>
							{#if latestSet.ptcgoCode}
								<p class="text-gray-300 mb-1">
									<span class="text-gray-400"
										>PTCGO Code:</span
									>
									{latestSet.ptcgoCode}
								</p>
							{/if}
							{#if latestSet.series}
								<p class="text-gray-300">
									<span class="text-gray-400">Series:</span>
									{latestSet.series}
								</p>
							{/if}
						</div>
					</div>
				</a>

				<div
					class="block bg-gray-800 p-6 rounded-lg shadow-lg transition-colors border border-transparent"
				>
					<h3
						class="text-xl font-bold text-gold-400 mb-4 flex items-center gap-2"
					>
						{#if !NO_IMAGES}
							<ChartIcon size={20} class="text-gold-400" />
						{/if}
						Set Statistics
					</h3>

					<div class="grid grid-cols-3 gap-4 mb-4">
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={latestSetPokemonCards.length}
									duration={3}
								/>
							</p>
							<p class="text-xs text-gray-300">Pokémon Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={latestSetTrainerCards.length}
									duration={2}
								/>
							</p>
							<p class="text-xs text-gray-300">Trainer Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={latestSetEnergyCards.length}
									duration={2}
								/>
							</p>
							<p class="text-xs text-gray-300">Energy Cards</p>
						</div>
					</div>

					<div>
						<p class="text-sm text-gray-300">
							<span class="text-gray-400">Completion value:</span>
							<span class="text-gold-400">
								<CountUp
									end={totalSetValue}
									duration={2}
									options={{ decimalPlaces: 2, prefix: "$" }}
								/>
							</span>
						</p>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Separator before Most Expensive Cards section -->
	<div
		class="w-full max-w-[200px] mx-auto my-12 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"
		class:hidden={!ready}
	></div>

	<!-- Most expensive cards latest set section -->
	{#if mostExpensiveLatestSetCards && mostExpensiveLatestSetCards.length > 0 && ready}
		<section
			class="mb-20"
			in:fly={{ y: 20, duration: 500, delay: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class="flex justify-between items-center mb-8">
				<h2
					class="text-2xl font-bold text-gold-400 flex items-center gap-2"
				>
					{#if !NO_IMAGES}
						<Tag size={24} />
					{/if}
					Most Valuable Cards in {latestSet.name}
				</h2>
				<a
					href="/cards-list?set={encodeURIComponent(latestSet.name)}"
					class="text-gold-400 hover:underline flex items-center gap-1 group"
				>
					View all cards
					<ArrowRight
						size={16}
						class="group-hover:translate-x-1 transition-all duration-[400ms]"
					/>
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
								<h3 class="font-bold text-sm mb-1 truncate">
									{card.name}
								</h3>
								{#if card.rarity}
									<p class="text-xs text-gray-400 mb-1">
										{card.rarity}
									</p>
								{/if}
								<p class="text-gold-400 font-bold text-sm">
									{formatPrice(
										prices[card.cardCode]?.simple ||
											prices[card.cardCode]?.trend,
									)}
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
		<section
			class="mt-20 mb-20"
			in:fly={{ y: 20, duration: 500, delay: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class="flex justify-between items-center mb-8">
				<h2
					class="text-2xl font-bold text-gold-400 flex items-center gap-2"
				>
					{#if !NO_IMAGES}
						<Tag size={24} />
					{/if}
					Most Valuable Cards
				</h2>
				<a
					href="/cards-list?mostexpensive=true&sortby=sort-price"
					class="text-gold-400 hover:underline flex items-center gap-1 group"
				>
					View all cards
					<ArrowRight
						size={16}
						class="group-hover:translate-x-1 transition-all duration-[400ms]"
					/>
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
								<h3 class="font-bold text-sm mb-1 truncate">
									{card.name}
								</h3>
								{#if card.rarity}
									<p class="text-xs text-gray-400 mb-1">
										{card.rarity}
									</p>
								{/if}
								<p class="text-gold-400 font-bold text-sm">
									{formatPrice(
										prices[card.cardCode]?.simple ||
											prices[card.cardCode]?.trend,
									)}
								</p>
							</div>
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Separator -->
	<div
		class="w-full max-w-[800px] mx-auto my-20 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"
		class:hidden={!ready}
	></div>

	<!-- Feature Highlights Section -->
	{#if ready}
		<section
			class="mb-20"
			in:fly={{ y: 30, duration: 600, delay: 400 }}
			out:fade={{ duration: 200 }}
		>
			<h2
				class="text-2xl md:text-3xl font-bold text-center text-gold-400 mb-12"
			>
				Discover PokéCards-Collector Features
			</h2>
			<div
				class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center feature-cards"
			>
				<!-- Collection Feature Card -->
				<div
					class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all duration-300 transform hover:-translate-y-1"
				>
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<BookOpenCheckIcon
								size={40}
								class="text-gold-400"
							/>
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">
						Manage Collection
					</h3>
					<p class="text-gray-400">
						Keep track of every card you own, organized by set and
						rarity.
					</p>
					{#if session}
						<a
							href="/collection"
							class="text-gold-400 hover:underline mt-4 inline-block"
						>
							My Collection
						</a>
					{:else}
						<button
							on:click={openAuthModal}
							class="text-gold-400 hover:underline mt-4 inline-block focus:outline-none"
							type="button"
						>
							Log in to manage your collection
						</button>
					{/if}
				</div>
				<!-- Wishlist Feature Card -->
				<div
					class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all duration-300 transform hover:-translate-y-1"
				>
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<HeartIcon size={40} class="text-gold-400" />
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">Build Wishlist</h3>
					<p class="text-gray-400">
						Curate a list of cards you desire to complete your
						collection goals.
					</p>
					{#if session}
						<a
							href="/wishlist"
							class="text-gold-400 hover:underline mt-4 inline-block"
						>
							My Wishlist
						</a>
					{:else}
						<button
							on:click={openAuthModal}
							class="text-gold-400 hover:underline mt-4 inline-block focus:outline-none"
							type="button"
						>
							Log in to build your wishlist
						</button>
					{/if}
				</div>
				<!-- Explore Feature Card (unchanged) -->
				<div
					class="bg-gray-800 p-6 rounded-lg shadow-lg border border-transparent hover:border-gold-400 transition-all duration-300 transform hover:-translate-y-1"
				>
					{#if !NO_IMAGES}
						<div class="flex justify-center mb-4">
							<SearchIcon size={40} class="text-gold-400" />
						</div>
					{/if}
					<h3 class="text-xl font-semibold mb-2">Explore & Search</h3>
					<p class="text-gray-400">
						Easily search and filter through thousands of cards and
						sets.
					</p>
					<a
						href="/cards-list"
						class="text-gold-400 hover:underline mt-4 inline-block"
					>
						Find Cards
					</a>
				</div>
			</div>
		</section>
	{/if}

	<!-- Binder Builder Section -->
	{#if ready}
		<section
			class="mb-20"
			in:fly={{ y: 30, duration: 600, delay: 450 }}
			out:fade={{ duration: 200 }}
		>
			<div class="feature-cards-container">
				<div
					class="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl p-6 lg:p-10 shadow-2xl border border-gold-600/30"
				>
					<div class="flex flex-col lg:flex-row items-center gap-8">
						<div class="flex-1">
							<h2
								class="text-2xl md:text-3xl font-bold text-gold-400 mb-4"
							>
								{#if !NO_IMAGES}
									<div class="flex items-center gap-2">
										<GridIcon size={28} />
										<span>Binder Builder</span>
									</div>
								{:else}
									Binder Builder
								{/if}
							</h2>
							<p class="text-gray-200 mb-4">
								Create a digital representation of your physical
								card binder with our powerful Binder Builder
								tool.
							</p>
							<ul
								class="list-disc list-inside text-gray-300 space-y-2 mb-6"
							>
								<li>
									Customize your grid to match your physical
									binder's layout
								</li>
								<li>
									Drag and drop cards to arrange them exactly
									how you want
								</li>
								<li>
									Add entire sets at once or individual cards
									from your collection
								</li>
								<li>Import cards using direct image URLs</li>
								<li>
									Export your binder page as an image to share
									with others
								</li>
							</ul>
							<a
								href="/binder"
								class="px-6 py-3 w-fit bg-gold-400 text-black font-bold rounded-lg transition-all duration-300 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900 mt-2 flex items-center gap-2"
							>
								Try Binder Builder
								{#if !NO_IMAGES}<GridIcon size={18} />{/if}
							</a>
						</div>
						<div class="flex-1 flex justify-center">
							<div
								class="w-full max-w-md bg-[#1a1a1a] rounded-lg shadow-inner relative overflow-hidden border border-[#444]"
								style="aspect-ratio: 1/1;"
							>
								<div
									class="absolute inset-0 grid grid-cols-3 grid-rows-3"
								>
									{#each Array(9) as _, i}
										<div
											class="relative bg-[#1e1e1e] border border-[#333] overflow-hidden"
										>
											{#if i < 6}
												{@const cards = new Map([
													[0, { name: "Riolu", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG26_hires.png", pokedexNumber: 447 }],
													[1, { name: "Swablu", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG27_hires.png", pokedexNumber: 333 }],
													[2, { name: "Duskull", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG28_hires.png", pokedexNumber: 355 }],
													[3, { name: "Bidoof", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG29_hires.png", pokedexNumber: 399 }],
													[4, { name: "Pikachu", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG30_hires.png", pokedexNumber: 25 }],
													[5, { name: "Turtwig", imageUrl: "https://images.pokemontcg.io/swsh12pt5gg/GG31_hires.png", pokedexNumber: 387 }]
												])}
												{@const card = cards.get(i) || { name: "Unknown", imageUrl: "", pokedexNumber: 0 }}
												<div class="absolute inset-0 flex items-center justify-center">
													{#if !NO_IMAGES}
														<CardImage
															imageUrl={card.imageUrl}
															alt={card.name}
															class="object-contain w-[90%] h-[90%]"
															lazy={true}
														/>
													{:else}
														<div class="w-[90%] h-[90%] bg-[#333] flex items-center justify-center text-[#555]">
															Pokemon {card.pokedexNumber}
														</div>
													{/if}
												</div>
											{:else}
												<div
													class="absolute inset-0 flex items-center justify-center text-[#555] text-[10px] font-light"
												>
													Drop card here
												</div>
											{/if}
										</div>
									{/each}
								</div>
								<div
									class="absolute top-2 right-2 bg-[#333] text-xs text-[#eee] px-2 py-1 rounded-md"
								>
									Preview
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Separator -->
	<div
		class="w-full max-w-[200px] mx-auto my-20 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"
		class:hidden={!ready}
	></div>

	<!-- Call to Action Section -->
	{#if ready}
		<section
			class="text-center bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-lg shadow-xl mb-20 border border-gold-600/30"
			in:fade={{ duration: 700, delay: 500 }}
			out:fade={{ duration: 200 }}
		>
			{#if session}
				<h2 class="text-2xl md:text-3xl font-bold text-gold-400 mb-8">
					Welcome back, {session.user.email}!
				</h2>
				<p class="text-gray-300 text-lg mb-10">
					Ready to manage your collection or check your wishlist?
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a
						href="/collection"
						class="px-6 py-3 bg-gold-400 hover:bg-gold-500 text-black font-bold rounded-lg transition-colors flex items-center gap-2"
					>
						Go to Collection
						{#if !NO_IMAGES}
							<BookOpenCheckIcon size={18} />
						{/if}
					</a>
					<a
						href="/wishlist"
						class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
					>
						View Wishlist
						{#if !NO_IMAGES}
							<HeartIcon size={18} />
						{/if}
					</a>
				</div>
			{:else}
				<h2 class="text-2xl md:text-3xl font-bold text-gold-400 mb-8">
					Join PokéCards-Collector Today!
				</h2>
				<p class="text-gray-300 text-lg mb-10">
					Sign up or log in to start managing your Pokémon card
					collection and wishlist.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<button
						on:click={openAuthModal}
						class="px-6 py-3 bg-gold-400 text-black font-bold rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900 focus:outline-none"
						type="button"
					>
						Log In
						{#if !NO_IMAGES}<LogInIcon size={18} />{/if}
					</button>
					<button
						on:click={openAuthModal}
						class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 focus:outline-none"
						type="button"
					>
						Sign Up
						{#if !NO_IMAGES}
							<UserPlusIcon size={18} />
						{/if}
					</button>
				</div>
			{/if}
		</section>
	{/if}

	<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.feature-cards-container {
		/* Use the same grid structure as the feature cards to ensure identical width */
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	@media (min-width: 768px) {
		.feature-cards {
			/* Define this to be used as a reference */
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 2rem;
		}

		.feature-cards-container {
			/* Match the exact column sizing of the feature cards grid */
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 2rem;
		}

		.feature-cards-container > div {
			/* Span all 3 columns */
			grid-column: span 3;
		}
	}
</style>
