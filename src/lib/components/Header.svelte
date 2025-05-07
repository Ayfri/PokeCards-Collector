<script lang="ts">
	import { page } from '$app/state';
	import { NO_IMAGES } from '$lib/images';
	import type { FullCard, Set, PriceData } from '$lib/types';
	import UserMenu from '@components/auth/UserMenu.svelte';
	import SearchBar from '@components/SearchBar.svelte';
	import SearchModal from '@components/SearchModal.svelte';
	import pokestore from '~/assets/pokestore.png';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	// Import icons
	import type { Icon } from 'lucide-svelte';
	import CardStackIcon from 'lucide-svelte/icons/layers';
	import LibraryIcon from 'lucide-svelte/icons/library';
	import ArtistIcon from 'lucide-svelte/icons/paintbrush';
	import ShuffleIcon from 'lucide-svelte/icons/shuffle';
	import BinderIcon from 'lucide-svelte/icons/book-open';
	import SearchUsersIcon from 'lucide-svelte/icons/users';
	import MenuIcon from 'lucide-svelte/icons/menu'; // Hamburger icon
	import XIcon from 'lucide-svelte/icons/x'; // Close icon
	import GlobeIcon from 'lucide-svelte/icons/globe'; // Globe icon for Japan section
	import { slide } from 'svelte/transition';

	// Re-add NavLink interface and constant
	interface NavLink {
		href: string;
		name: string;
		icon: typeof Icon | null;
	}

	const navLinks: NavLink[] = [
		{ href: '/', name: 'PokéStore', icon: null }, // HomeIcon wasn't used here
		{ href: '/cards-list', name: 'Cards', icon: CardStackIcon },
		{ href: '/japan', name: 'Japan', icon: GlobeIcon },
		{ href: '/sets', name: 'Sets', icon: LibraryIcon },
		{ href: '/artists', name: 'Artists', icon: ArtistIcon },
		{ href: '/binder', name: 'Binder', icon: BinderIcon },
		{ href: '/random', name: 'Random Card', icon: ShuffleIcon },
		{ href: '/search-user', name: 'Users', icon: SearchUsersIcon },
	];

	// State for mobile menu
	let isMobileMenuOpen = false;
	let mobileMenuButton: HTMLButtonElement;
	let mobileMenuNav: HTMLDivElement;

	// Use data from page state directly
	$: user = page.data.user;
	$: profile = page.data.profile;
	$: prices = page.data.prices as Record<string, PriceData> || {};
	$: allCards = page.data.allCards as FullCard[] || [];
	$: sets = page.data.sets as Set[] || [];

	// Use afterNavigate instead of reactive statement
	afterNavigate(() => {
		isMobileMenuOpen = false;
	});
	
	function handleClickOutside(event: MouseEvent) {
		if (isMobileMenuOpen && mobileMenuNav && mobileMenuButton) {
			// Check if click was outside the mobile menu and not on the menu button
			const targetEl = event.target as Node;
			if (!mobileMenuNav.contains(targetEl) && !mobileMenuButton.contains(targetEl)) {
				isMobileMenuOpen = false;
			}
		}
	}
	
	onMount(() => {
		// Add event listener to handle clicks outside the menu
		window.addEventListener('click', handleClickOutside);
		
		return () => {
			// Clean up the event listener when component is destroyed
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<header class="fixed top-0 left-0 w-full p-2 pb-6 lg:pb-12 z-50 bg-gradient-to-b from-gray-900 to-transparent">
	<div class="relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full bg-gray-800">
		<!-- Hamburger Menu and Optional Mobile Logo -->
		<div class="flex items-center gap-2">
			<!-- Hamburger Menu Button (Visible on Mobile) -->
			<button
				aria-label="Toggle menu"
				class="lg:hidden text-gray-400 hover:text-gold-400 transition-colors duration-200 p-1 -ml-1"
				on:click|stopPropagation={() => isMobileMenuOpen = !isMobileMenuOpen}
				bind:this={mobileMenuButton}
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
			{#each navLinks as link}
				<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href={link.href}>
					{#if !NO_IMAGES && link.icon}
						<svelte:component this={link.icon} size={16} />
					{/if}
					{#if link.name === 'PokéStore'}
						<span class="font-bold text-lg">{link.name}</span>
					{:else}
						{link.name}
					{/if}
				</a>
			{/each}
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

			<!-- User menu - Pass down user and profile props with correct names -->
			<UserMenu userProp={user} profileProp={profile} />
		</div>
	</div>

	<!-- Centered Logo (Desktop) - Placed outside the main flex container -->
	<a
		class="logo-link absolute left-1/2 top-[2/3] -translate-x-1/2 -translate-y-1/2 p-2 lg:p-2.5 rounded-full"
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
			bind:this={mobileMenuNav}
			on:click|stopPropagation={() => {}}
		>
			<nav class="flex flex-col gap-3">
				{#each navLinks as link}
					<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href={link.href}>
						{#if !NO_IMAGES && link.icon}
							<svelte:component this={link.icon} size={20} />
						{/if}
						{#if link.name === 'PokéStore'}
							<span class="font-bold text-lg">{link.name}</span>
						{:else}
							{link.name}
						{/if}
					</a>
				{/each}
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
