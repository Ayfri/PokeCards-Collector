<script lang="ts">
	import {page} from '$app/state';
	import {NO_IMAGES} from '$lib/images';
	import type {FullCard, Set, PriceData} from '$lib/types';
	import UserMenu from '@components/auth/UserMenu.svelte';
	import SearchBar from '@components/SearchBar.svelte';
	import SearchModal from '@components/SearchModal.svelte';
	import pokestore from '~/assets/pokestore.png';
	// Import icons
	import HomeIcon from 'lucide-svelte/icons/home';
	import CardStackIcon from 'lucide-svelte/icons/layers';
	import LibraryIcon from 'lucide-svelte/icons/library';
	import ArtistIcon from 'lucide-svelte/icons/paintbrush';
	import ShuffleIcon from 'lucide-svelte/icons/shuffle';
	import BinderIcon from 'lucide-svelte/icons/book-open';
	import MenuIcon from 'lucide-svelte/icons/menu'; // Hamburger icon
	import XIcon from 'lucide-svelte/icons/x'; // Close icon
	import { slide } from 'svelte/transition';

	// State for mobile menu
	let isMobileMenuOpen = false;

	// Use allCards from layout data instead of page-specific data
	$: prices = page.data.prices as Record<string, PriceData> || {};
	$: allCards = page.data.allCards as FullCard[] || [];
	$: sets = page.data.sets as Set[] || [];

	// Close mobile menu on navigation
	$: page.url, isMobileMenuOpen = false;
</script>

<header class="relative w-full p-2 pb-6 lg:pb-12 z-40">
	<div class="relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full bg-gray-800 z-50">
		<!-- Hamburger Menu and Optional Mobile Logo -->
		<div class="flex items-center gap-2">
			<!-- Hamburger Menu Button (Visible on Mobile) -->
			<button
				aria-label="Toggle menu"
				class="lg:hidden text-gray-400 hover:text-gold-400 transition-colors duration-200 p-1 -ml-1"
				on:click={() => isMobileMenuOpen = !isMobileMenuOpen}
			>
				{#if isMobileMenuOpen}
					<XIcon size={24} />
				{:else}
					<MenuIcon size={24} />
				{/if}
			</button>
		</div>

		<!-- Desktop Navigation Links (Hidden on Mobile) -->
		<nav class="hidden lg:flex items-center gap-4">
			<!-- Home link added back for desktop -->
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/">
				{#if !NO_IMAGES}
					<HomeIcon size={16} />
				{/if}
				Home
			</a>
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/cards-list">
				{#if !NO_IMAGES}
				<CardStackIcon size={16} />
				{/if}
				Cards
			</a>
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/sets">
				{#if !NO_IMAGES}
				<LibraryIcon size={16} />
				{/if}
				Sets
			</a>
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/artists">
				{#if !NO_IMAGES}
				<ArtistIcon size={16} />
				{/if}
				Artists
			</a>
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/binder">
				{#if !NO_IMAGES}
				<BinderIcon size={16} />
				{/if}
				Binder
			</a>
			<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href="/random">
				{#if !NO_IMAGES}
				<ShuffleIcon size={16} />
				{/if}
				Random Card
			</a>
		</nav>

		<!-- Spacer -->
		<span class="flex-1 hidden lg:block"></span>

		<!-- Search and User Menu -->
		<div class="flex items-center gap-2 xs:gap-4">
			<!-- Search on desktop: visible on sm screens and up -->
			<div class="w-48 sm:w-60 md:w-72 lg:w-80 max-sm:hidden">
				<SearchBar {allCards} {prices} {sets} />
			</div>

			<!-- Mobile search using the Svelte component -->
			<SearchModal {allCards} {prices} {sets} />

			<!-- User menu -->
			<UserMenu />
		</div>
	</div>

	<!-- Centered Logo (Desktop) - Placed outside the main flex container -->
	<a
		class="logo-link absolute left-1/2 top-[2/3] -translate-x-1/2 -translate-y-1/2 p-2 lg:p-2.5 rounded-full z-50"
		href="/"
	>
		{#if !NO_IMAGES}
			<img
				alt="PokéStore Logo"
				loading="eager"
				class="object-contain aspect-square size-10 xs:size-12 lg:size-16"
				src={pokestore}
			/>
		{/if}
	</a>

	<!-- Mobile Navigation Drawer -->
	{#if isMobileMenuOpen}
		<div
			class="absolute top-3/4 left-0 right-0 mt-1 mx-2 p-4 rounded-xl shadow-lg bg-gray-800 lg:hidden z-50"
			role="dialog"
			aria-modal="true"
			transition:slide={{ duration: 150, axis: 'y' }}
		>
			<nav class="flex flex-col gap-3">
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/">
					<HomeIcon size={20} /> Home
				</a>
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/cards-list">
					<CardStackIcon size={20} /> Cards
				</a>
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/sets">
					<LibraryIcon size={20} /> Sets
				</a>
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/artists">
					<ArtistIcon size={20} /> Artists
				</a>
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/binder">
					<BinderIcon size={20} /> Binder
				</a>
				<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href="/random">
					<ShuffleIcon size={20} /> Random Card
				</a>
			</nav>
		</div>
	{/if}
</header>

<style lang="postcss">
	/* Added the logo-link style back */
	.logo-link {
		background-image: linear-gradient(transparent 50%, theme(colors.gray.800) 50%);
	}

	.nav-link {
		position: relative;
	}
	
	.nav-link:hover::after {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: theme(colors.gold.400);
		transform-origin: center;
		transform: scaleX(1);
		transition: transform 0.3s ease;
	}
	
	.nav-link::after {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: theme(colors.gold.400);
		transform-origin: center;
		transform: scaleX(0);
		transition: transform 0.3s ease;
	}
</style>
