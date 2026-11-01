<script lang="ts">
	import { resolve } from "$app/paths";
	import type { PageData } from "./$types";
	import BinderPage from "#components/binder/BinderPage.svelte";
	import CardImage from "#components/card/CardImage.svelte";
	import RaritySymbol from "#components/card/RaritySymbol.svelte";
	import SetLogo from "#components/SetLogo.svelte";
	import CountUp from "#components/ui/CountUp.svelte";
	import { CATALOGUES } from "#helpers/catalogues.ts";
	import { formatDate, formatEuros } from "#helpers/format.ts";
	import { NO_IMAGES } from "#helpers/card-images.ts";
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import GiftIcon from "@lucide/svelte/icons/gift";
	import Tag from "@lucide/svelte/icons/tag";
	import ArrowRight from "@lucide/svelte/icons/arrow-right";
	import PokemonIcon from "@lucide/svelte/icons/gamepad-2";
	import SetIcon from "@lucide/svelte/icons/layers";
	import GridIcon from "@lucide/svelte/icons/layout-grid";
	import PaintbrushIcon from "@lucide/svelte/icons/paintbrush";
	import ChartIcon from "@lucide/svelte/icons/chart-column";
	import HeartIcon from "@lucide/svelte/icons/heart";
	import SearchIcon from "@lucide/svelte/icons/search";
	import BookOpenCheckIcon from "@lucide/svelte/icons/book-open-check";
	import LogInIcon from "@lucide/svelte/icons/log-in";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';
	import Flag from '#components/Flag.svelte';
	import AuthModal from '#components/auth/AuthModal.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const tiles = $derived([
		{ count: data.stats.totalCards, duration: 4, href: '/cards-list', language: 'en' as const, label: 'EN Cards', title: 'Browse every English card' },
		...[CATALOGUES.ja, CATALOGUES.fr].map(catalogue => ({
			count: data.stats.foreignCards[catalogue.language],
			duration: 4,
			href: catalogue.gridRoute,
			language: catalogue.language,
			label: `${catalogue.routeCode.toUpperCase()} Cards`,
			title: `Browse the ${catalogue.adjective} catalogue`,
		})),
		{ count: data.stats.uniquePokemon, duration: 3.5, href: '/cards-list?type=pokemon', icon: PokemonIcon, label: 'Pokémon', title: 'Browse the Pokemon cards' },
		{ count: data.sets.length, duration: 2, href: '/sets', icon: SetIcon, label: 'Sets', title: 'Browse every set' },
		{ count: data.stats.artists, duration: 2.5, href: '/artists', icon: PaintbrushIcon, label: 'Artists', title: 'Browse every illustrator' },
	]);

	const FEATURE_CARD_CLASS = 'card-tile p-6';

	const GAMES = [
		{
			action: "Play today's Card.dle",
			description: "Find the day's mystery card from the hints every guess reveals. One card a day, the same for everyone.",
			features: ['Seven hints per guess: Pokémon, artist, set, rarity, supertype, type and price', 'An easy mode that narrows the list as hints turn green', 'A daily streak and a spoiler-free grid to share'],
			href: '/card.dle',
			icon: PuzzleIcon,
			name: 'Card.dle'
		},
		{
			action: 'Start guessing',
			description: 'Look at a real card and guess what it sells for on Cardmarket. The closer you land, the more you score.',
			features: ['Points for accuracy, with a combo up to x3 on a streak', 'Your best streak, total score and accuracy breakdown', 'Endless rounds, no account needed'],
			href: '/guess-the-price',
			icon: CircleEuroIcon,
			name: 'Guess the Price'
		}
	];

	/** The server sends one flat list for the two-page spread, page 2 starting after the 9 slots of page 1. */
	const binderPages = $derived([data.binderPreview.slice(0, 9), data.binderPreview.slice(9)]);

	let isAuthModalOpen = $state(false);
	let authMode: 'login' | 'register' = $state('login');
	function openAuthModal(mode: 'login' | 'register') {
		authMode = mode;
		isAuthModalOpen = true;
	}
	function closeAuthModal() { isAuthModalOpen = false; }
</script>

{#snippet valuableCards(title: string, href: string, cards: PageData['mostExpensiveCards'])}
	{#if cards.length > 0}
		<section
			class="mb-20"
			style="--intro-delay: 300ms"
		>
			<div class="flex justify-between items-center mb-8">
				<h2
					class="text-xl md:text-2xl font-bold text-gold-400 flex items-center gap-2"
				>
					{#if !NO_IMAGES}
						<Tag size={24} />
					{/if}
					{title}
				</h2>
				<a
					{href}
					class="text-gold-400 hover:underline flex items-center gap-1 group"
				>
					View all cards
					<ArrowRight
						size={16}
						class="group-hover:translate-x-1 transition-all duration-300"
					/>
				</a>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{#each cards as card, i (card.cardCode)}
					<div
						class="card-tile overflow-hidden flex flex-col"
					>
						<a href={resolve('/card/[cardCode]', { cardCode: card.cardCode })} class="block">
							<div class="relative pt-[140%]">
								<CardImage
									imageUrl={card.image}
									{card}
									types={card.types}
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
									<p class="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
										<RaritySymbol decorative rarity={card.rarity} />{card.rarity}
									</p>
								{/if}
								<p class="text-gold-400 font-bold text-sm">
									{card.price ? formatEuros(card.price) : "N/A"}
								</p>
							</div>
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

<main class="container mx-auto px-4 py-8 text-white overflow-x-hidden">
	<section class="flex flex-col md:flex-row gap-8 mb-20" style="--intro-delay: 100ms">
		<div class="flex-1">
			<h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-balance text-gold-400">
				Welcome to PokéCards-Collector
			</h1>
			<p class="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl text-pretty">
				Your ultimate resource for Pokémon TCG cards. Explore our
				complete collection, track price trends, and manage your
				personal collection.
			</p>

			<div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
				{#each tiles as tile (tile.href)}
					<a
						href={tile.href}
						class="card-tile p-4 text-center overflow-hidden"
						title={tile.title}
					>
						{#if !NO_IMAGES}
							<div class="flex h-6 items-center justify-center mb-2">
								{#if tile.language}
									<Flag class="h-5 w-7.5 rounded-xs ring-1 ring-white/20" language={tile.language} />
								{:else if tile.icon}
									<tile.icon size={24} class="text-gold-400" />
								{/if}
							</div>
						{/if}
						<div class="flex items-center justify-center w-full">
							<ChevronRight size={12} class="text-gold-400 shrink-0 mr-1 animate-bounce-right" />
							<span class="text-xl md:text-2xl font-bold text-gold-400">
								<CountUp end={tile.count} duration={tile.duration} />
							</span>
							<ChevronLeft size={12} class="text-gold-400 shrink-0 ml-1 animate-bounce-left" />
						</div>
						<p class="text-sm text-gray-400">{tile.label}</p>
					</a>
				{/each}
			</div>

			<div class="flex flex-wrap gap-4 mb-10 md:mb-0">
				<a
					href="/cards-list"
					class="btn-gold group"
				>
					Explore Cards
					<ArrowRight
						size={18}
						class="group-hover:translate-x-1 transition-all duration-300"
					/>
				</a>
			</div>
		</div>

		<div class="flex-1 flex flex-col justify-center items-center gap-3 mt-8 lg:mt-0">
			{#if data.latestSet}
				<h2 class="text-lg font-semibold uppercase tracking-[0.2em] text-gold-400">Latest set</h2>
				<a
					href="/cards-list?set={encodeURIComponent(
						data.latestSet.name,
					)}"
					class="relative w-full max-w-lg transform transition-all duration-300 hover:scale-105 block"
				>
					<SetLogo class="w-[95%] mb-2 object-contain mx-auto rounded-lg shadow-md" set={data.latestSet}>
						{#snippet fallback()}
							<div class="w-[95%] aspect-3/1 mb-2 mx-auto rounded-lg bg-gray-800 flex items-start justify-center pt-6">
								<SetIcon class="text-gray-600" size={56} />
							</div>
						{/snippet}
					</SetLogo>
					<div
						class="absolute bottom-0 left-0 right-0 bg-linear-to-t from-gray-900/90 via-gray-900/50 to-transparent p-4 rounded-b-2xl"
					>
						<h3
							class="text-xl font-bold text-gold-400 w-fit drop-shadow-[0_0_7px_black]"
						>
							{data.latestSet.name}
						</h3>
						<p
							class="text-sm text-gray-300 w-fit drop-shadow-[0_0_7px_black]"
						>
							Released on {formatDate(data.latestSet.releaseDate)}
						</p>
					</div>
				</a>
			{/if}
		</div>
	</section>

	<div
		class="gold-rule my-16"
	></div>

	{#if data.latestSet}
		<section
			class="mb-20"
			style="--intro-delay: 200ms"
		>
			<div
				class="flex flex-col sm:flex-row justify-between items-center mb-8"
			>
				<a
					href="/cards-list?set={encodeURIComponent(data.latestSet.name)}"
					class="text-gold-400 hover:text-gold-300 transition-colors"
				>
					<h2 class="text-xl md:text-2xl font-bold flex items-center gap-2">
						{#if !NO_IMAGES}
							<GiftIcon size={24} />
						{/if}
						Latest Set: {data.latestSet.name}
					</h2>
				</a>
				<a
					href="/cards-list?set={encodeURIComponent(data.latestSet.name)}"
					class="text-gold-400 hover:underline flex items-center gap-1 group"
				>
					View all cards in this set
					<ArrowRight
						size={16}
						class="group-hover:translate-x-1 transition-all duration-300"
					/>
				</a>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
				<a
					href="/cards-list?set={encodeURIComponent(data.latestSet.name)}"
					class="card-tile block p-6"
				>
					<div class="flex flex-col sm:flex-row gap-6 items-center">
						<SetLogo class="w-32 h-32 object-contain" set={data.latestSet}>
							{#snippet fallback()}
								<div class="w-32 h-32 shrink-0 rounded-lg bg-gray-900 flex items-center justify-center">
									<SetIcon class="text-gray-600" size={48} />
								</div>
							{/snippet}
						</SetLogo>

						<div>
							<h3 class="text-xl font-bold mb-2">
								{data.latestSet.name}
							</h3>
							<p class="text-gray-300 mb-1">
								<span class="text-gray-400">Release Date:</span>
								{formatDate(data.latestSet.releaseDate)}
							</p>
							<p class="text-gray-300 mb-1">
								<span class="text-gray-400"
									>Number of Cards:</span
								>
								{data.latestSet.printedTotal}
							</p>
							{#if data.latestSet.ptcgoCode}
								<p class="text-gray-300 mb-1">
									<span class="text-gray-400"
										>PTCGO Code:</span
									>
									{data.latestSet.ptcgoCode}
								</p>
							{/if}
							{#if data.latestSet.series}
								<p class="text-gray-300">
									<span class="text-gray-400">Series:</span>
									{data.latestSet.series}
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
						<div class="bg-gray-700 p-3 rounded-sm text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={data.latestSetStats.pokemonCards}
									duration={3}
								/>
							</p>
							<p class="text-xs text-gray-300">Pokémon Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded-sm text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={data.latestSetStats.trainerCards}
									duration={2}
								/>
							</p>
							<p class="text-xs text-gray-300">Trainer Cards</p>
						</div>
						<div class="bg-gray-700 p-3 rounded-sm text-center">
							<p class="text-lg font-bold text-gold-400">
								<CountUp
									end={data.latestSetStats.energyCards}
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
									end={data.latestSetStats.totalValue}
									duration={2}
									options={{ decimalPlaces: 2, suffix: " €" }}
								/>
							</span>
						</p>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<div
		class="gold-rule my-12"
	></div>

	{#if data.latestSet}
		{@render valuableCards(`Most Valuable Cards in ${data.latestSet.name}`, `/cards-list?set=${encodeURIComponent(data.latestSet.name)}`, data.mostExpensiveLatestSetCards)}
	{/if}
	{@render valuableCards('Most Valuable Cards', '/cards-list?mostexpensive=true&sortby=sort-price', data.mostExpensiveCards)}

	<div
		class="gold-rule my-20"
	></div>

	<section
		class="mb-20"
		style="--intro-delay: 400ms"
	>
		<h2
			class="text-xl md:text-2xl font-bold text-center text-gold-400 mb-12"
		>
			Discover PokéCards-Collector Features
		</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
			<div class={FEATURE_CARD_CLASS}>
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
				{#if data.profile}
					<a
						href="/collection"
						class="text-gold-400 hover:underline mt-4 inline-block"
					>
						My Collection
					</a>
				{:else}
					<button
						onclick={() => openAuthModal('login')}
						class="focus-ring text-gold-400 hover:underline mt-4 inline-block"
						title="Sign in to track your collection"
						type="button"
					>
						Log in to manage your collection
					</button>
				{/if}
			</div>
			<div class={FEATURE_CARD_CLASS}>
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
				{#if data.profile}
					<a
						href="/wishlist"
						class="text-gold-400 hover:underline mt-4 inline-block"
					>
						My Wishlist
					</a>
				{:else}
					<button
						onclick={() => openAuthModal('register')}
						class="focus-ring text-gold-400 hover:underline mt-4 inline-block"
						title="Create an account to build a wishlist"
						type="button"
					>
						Log in to build your wishlist
					</button>
				{/if}
			</div>
			<div class={FEATURE_CARD_CLASS}>
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

	<section
		class="mb-20"
		style="--intro-delay: 450ms"
	>
		<div
			class="bg-linear-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl p-6 lg:p-10 shadow-2xl border border-gold-600/30"
		>
			<div class="flex flex-col lg:flex-row items-center gap-8">
				<div class="flex-1">
					<h2
						class="text-xl md:text-2xl font-bold text-gold-400 mb-4"
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
						class="btn-gold mt-2 w-fit"
						title="Open the Binder Builder"
					>
						Try Binder Builder
						{#if !NO_IMAGES}<GridIcon size={18} />{/if}
					</a>
				</div>
				<div class="flex-1 lg:flex-[1.4] flex justify-center w-full">
					<!-- A static copy of the /binder spread: the 10/7 ratio gives BinderPage's container-query sizing the height it needs. -->
					<a
						class="flex aspect-7/10 w-full max-w-sm sm:aspect-10/7 sm:max-w-2xl justify-center gap-2 rounded-2xl bg-gray-900 p-3 ring-1 ring-white/5 inset-shadow-sm transition-transform duration-300 hover:scale-[1.02]"
						href="/binder"
						title="Open the Binder Builder"
					>
						{#each binderPages as slots, pageIndex (pageIndex)}
							{#if pageIndex === 1}
								<div class="hidden w-6 shrink-0 flex-col items-center justify-center gap-6 rounded bg-black/40 sm:flex">
									{#each Array(3) as _, ring (ring)}
										<span class="size-3 rounded-full border-2 border-gray-600 bg-gray-800"></span>
									{/each}
								</div>
							{/if}
							<div class={['min-w-0 flex-1', pageIndex === 1 && 'hidden sm:block']}>
								<BinderPage columns={3} {pageIndex} rows={3} {slots} />
							</div>
						{/each}
					</a>
				</div>
			</div>
		</div>
	</section>

	<section
		class="mb-20"
		style="--intro-delay: 475ms"
	>
		<h2 class="text-xl md:text-2xl font-bold text-center text-gold-400 mb-3">Play a Pokémon TCG Game</h2>
		<p class="text-center text-gray-400 mb-10">Two free games built on the real catalogue, playable without an account.</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			{#each GAMES as game (game.href)}
				<article class="card-tile flex flex-col gap-4 p-6">
					<h3 class="flex items-center gap-3 text-xl font-semibold text-gold-300">
						{#if !NO_IMAGES}<game.icon class="text-gold-400" size={32} />{/if}
						{game.name}
					</h3>
					<p class="text-gray-200">{game.description}</p>
					<ul class="list-disc list-inside space-y-1.5 text-gray-400">
						{#each game.features as feature (feature)}
							<li>{feature}</li>
						{/each}
					</ul>
					<a class="btn-gold mt-auto w-fit" href={game.href} title="Open {game.name}">
						{game.action}
						{#if !NO_IMAGES}<ArrowRight size={18} />{/if}
					</a>
				</article>
			{/each}
		</div>
	</section>

	<div
		class="gold-rule my-20"
	></div>

	<section
		class="text-center bg-linear-to-br from-gray-800 to-gray-900 p-8 rounded-lg shadow-xl mb-20 border border-gold-600/30"
		style="--intro-delay: 500ms"
	>
		{#if data.profile}
			<h2 class="text-xl md:text-2xl font-bold text-gold-400 mb-8">
				Welcome back, {data.profile.username}!
			</h2>
			<p class="text-gray-300 text-lg mb-10">
				Ready to manage your collection or check your wishlist?
			</p>
			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/collection"
					class="btn-gold"
				>
					Go to Collection
					{#if !NO_IMAGES}
						<BookOpenCheckIcon size={18} />
					{/if}
				</a>
				<a
					href="/wishlist"
					class="btn-secondary"
				>
					View Wishlist
					{#if !NO_IMAGES}
						<HeartIcon size={18} />
					{/if}
				</a>
			</div>
		{:else}
			<h2 class="text-xl md:text-2xl font-bold text-gold-400 mb-8">
				Join PokéCards-Collector Today!
			</h2>
			<p class="text-gray-300 text-lg mb-10">
				Sign up or log in to start managing your Pokémon card
				collection and wishlist.
			</p>
			<div class="flex flex-wrap justify-center gap-4">
				<button
					onclick={() => openAuthModal('login')}
					class="btn-gold"
					title="Sign in to your account"
					type="button"
				>
					Log In
					{#if !NO_IMAGES}<LogInIcon size={18} />{/if}
				</button>
				<button
					onclick={() => openAuthModal('register')}
					class="btn-secondary"
					title="Create a new account"
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

	<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} initialMode={authMode} />
</main>

<style>
	/* The intro is a CSS animation, not a Svelte `in:` transition behind an `onMount` flag: that flag made the server send an
	   empty document to crawlers. The animation plays on the hydrated markup, so the page renders in full on the server. */
	section {
		animation: intro 500ms var(--intro-delay, 0ms) both;
	}

	@keyframes intro {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		section {
			animation: none;
		}
	}
</style>
