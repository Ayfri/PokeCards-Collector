<script lang="ts">
	import { page } from '$app/state';
	import { NO_IMAGES } from '$lib/images';
	import type { FullCard, Set, PriceData } from '$lib/types';
	import UserMenu from '@components/auth/UserMenu.svelte';
	import SearchBar from '@components/SearchBar.svelte';
	import SearchModal from '@components/SearchModal.svelte';
	import ThemeToggle from '@components/ThemeToggle.svelte';
	import pokecardsCollector from '~/assets/pokecards-collector.png';
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
	import MenuIcon from 'lucide-svelte/icons/menu';
	import XIcon from 'lucide-svelte/icons/x';
	import GlobeIcon from 'lucide-svelte/icons/globe';
	import ListIcon from 'lucide-svelte/icons/list';
	import PuzzleIcon from 'lucide-svelte/icons/puzzle';
	import GamepadIcon from 'lucide-svelte/icons/gamepad-2';
	import SearchIcon from 'lucide-svelte/icons/search';
	import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';

	// New interface for navigation groups with dropdowns
	interface NavLink {
		href?: string;
		name: string;
		icon: typeof Icon | null;
		isDropdown?: boolean;
		children?: NavLink[];
	}

	const navLinks: NavLink[] = [
		{ href: '/', name: 'PCC', icon: null },
		{
			name: 'Browse',
			icon: SearchIcon,
			isDropdown: true,
			children: [
				{ href: '/pokemons', name: 'Pokémons', icon: ListIcon },
				{ href: '/cards-list', name: 'Cards', icon: CardStackIcon },
				{ href: '/sets', name: 'Sets', icon: LibraryIcon },
				{ href: '/artists', name: 'Artists', icon: ArtistIcon },
				{ href: '/japan', name: 'Japan', icon: GlobeIcon },
				{ href: '/random', name: 'Random Card', icon: ShuffleIcon },
			]
		},
		{
			name: 'Games',
			icon: GamepadIcon,
			isDropdown: true,
			children: [
				{ href: '/card.dle', name: 'Card.dle', icon: PuzzleIcon },
				{ href: '/guess-the-price', name: 'Guess The Price', icon: PuzzleIcon },
			]
		},
		{ href: '/binder', name: 'Binder', icon: BinderIcon },
		{ href: '/users', name: 'Users', icon: SearchUsersIcon },
	];

	// State for mobile menu and dropdowns
	let isMobileMenuOpen = false;
	let mobileMenuButton: HTMLButtonElement;
	let mobileMenuNav: HTMLDivElement;
	let openDropdown: string | null = null; // Track which dropdown is open

	// Use data from page state directly
	$: user = page.data.user;
	$: profile = page.data.profile;
	$: prices = page.data.prices as Record<string, PriceData> || {};
	$: allCards = page.data.allCards as FullCard[] || [];
	$: sets = page.data.sets as Set[] || [];

	// Use afterNavigate instead of reactive statement
	afterNavigate(() => {
		isMobileMenuOpen = false;
		openDropdown = null; // Close dropdowns on navigation
	});

	function handleClickOutside(event: MouseEvent) {
		if (isMobileMenuOpen && mobileMenuNav && mobileMenuButton) {
			// Check if click was outside the mobile menu and not on the menu button
			const targetEl = event.target as Node;
			if (!mobileMenuNav.contains(targetEl) && !mobileMenuButton.contains(targetEl)) {
				isMobileMenuOpen = false;
			}
		}
		// Close dropdowns when clicking outside
		openDropdown = null;
	}

	function toggleDropdown(linkName: string) {
		openDropdown = openDropdown === linkName ? null : linkName;
	}

	onMount(() => {
		// Add event listener to handle clicks outside the menu
		window.addEventListener('click', handleClickOutside);

		return () => {
			// Clean up the event listener when component is destroyed
			window.removeEventListener('click', handleClickOutside);
		};
	});

	const discordInviteUrl = 'https://discord.com/invite/7c7nzHqxJx';
</script>

<header class="fixed top-0 left-0 w-full p-2 pb-6 lg:pb-12 z-50 bg-gradient-to-b from-gray-100 dark:from-gray-900 to-transparent">
	<div class="relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
		<!-- Hamburger Menu and Optional Mobile Logo -->
		<div class="flex items-center gap-2">
			<!-- Hamburger Menu Button (Visible on Mobile) -->
			<button
				aria-label="Toggle menu"
				class="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gold-400 transition-colors duration-200 p-1 -ml-1"
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
			{#each navLinks as link}
				{#if link.href === '/'}
					<a class="nav-link text-gray-600 dark:text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2" href={link.href}>
						{#if !NO_IMAGES}
							<img
								alt="PokéCards-Collector Logo"
								loading="eager"
								class="object-contain aspect-square h-10 w-10"
								src={pokecardsCollector}
							/>
						{/if}
						<span class="font-bold text-lg">{link.name}</span>
					</a>
				{:else if link.isDropdown && link.children}
					<!-- Dropdown Menu -->
					<div class="relative">
						<button
							class="nav-link text-gray-600 dark:text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1"
							on:click|stopPropagation={() => toggleDropdown(link.name)}
						>
							{#if !NO_IMAGES && link.icon}
								<svelte:component this={link.icon} size={16} />
							{/if}
							{link.name}
							<ChevronDownIcon size={14} class="transition-transform duration-200 {openDropdown === link.name ? 'rotate-180' : ''}" />
						</button>

						{#if openDropdown === link.name}
							<div
								class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-48 z-10"
								transition:slide={{ duration: 200, axis: 'y' }}
							>
								{#each link.children as child}
									<a
										href={child.href}
										class="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-gold-400 hover:bg-gray-700 transition-colors duration-200"
									>
										{#if !NO_IMAGES && child.icon}
											<svelte:component this={child.icon} size={16} />
										{/if}
										{child.name}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<a class="nav-link text-gray-600 dark:text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href={link.href}>
						{#if !NO_IMAGES && link.icon}
							<svelte:component this={link.icon} size={16} />
						{/if}
						{link.name}
					</a>
				{/if}
			{/each}
		</nav>

		<!-- Spacer -->
		<span class="flex-1 hidden lg:block"></span>

		<!-- Search and User Menu -->
		<div class="flex items-center gap-2 xs:gap-4">
			<!-- Discord Icon (left of search bar, desktop only) -->
			<a
				href={discordInviteUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Join our Discord community"
				class="hidden sm:flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-indigo-400 transition-colors duration-200 mr-1"
				title="Join our Discord community"
			>
				<!-- Inline Discord SVG -->
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.077.077 0 0 0-.082.038c-.357.63-.755 1.453-1.037 2.104a18.524 18.524 0 0 0-5.49 0 12.683 12.683 0 0 0-1.05-2.104.077.077 0 0 0-.082-.038A19.736 19.736 0 0 0 3.677 4.369a.069.069 0 0 0-.03.027C.533 9.09-.32 13.579.099 18.021a.082.082 0 0 0 .031.056c2.104 1.548 4.144 2.488 6.138 3.115a.077.077 0 0 0 .084-.027c.472-.65.893-1.34 1.248-2.066a.076.076 0 0 0-.041-.104c-.669-.252-1.304-.558-1.917-.892a.077.077 0 0 1-.008-.128c.129-.098.258-.2.381-.304a.074.074 0 0 1 .077-.01c4.014 1.83 8.36 1.83 12.326 0a.073.073 0 0 1 .078.009c.123.104.252.206.381.304a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.918.892.076.076 0 0 0-.04.105c.36.726.78 1.416 1.247 2.066a.076.076 0 0 0 .084.028c1.995-.627 4.036-1.567 6.139-3.115a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.637-3.548-13.625a.061.061 0 0 0-.03-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.944 2.419-2.157 2.419Z" fill="currentColor"/>
				</svg>
			</a>
			<!-- Search on desktop: visible on sm screens and up -->
			<div class="w-48 sm:w-60 md:w-72 lg:w-80 max-sm:hidden">
				<SearchBar {allCards} {prices} {sets} />
			</div>

			<!-- Mobile search using the Svelte component -->
			<SearchModal {allCards} {prices} {sets} />
			<!-- Discord Icon (mobile, left of search modal) -->
			<a
				href={discordInviteUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Join our Discord community"
				class="flex sm:hidden items-center justify-center text-gray-600 dark:text-gray-400 hover:text-indigo-400 transition-colors duration-200 mr-1"
				title="Join our Discord community"
			>
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.077.077 0 0 0-.082.038c-.357.63-.755 1.453-1.037 2.104a18.524 18.524 0 0 0-5.49 0 12.683 12.683 0 0 0-1.05-2.104.077.077 0 0 0-.082-.038A19.736 19.736 0 0 0 3.677 4.369a.069.069 0 0 0-.03.027C.533 9.09-.32 13.579.099 18.021a.082.082 0 0 0 .031.056c2.104 1.548 4.144 2.488 6.138 3.115a.077.077 0 0 0 .084-.027c.472-.65.893-1.34 1.248-2.066a.076.076 0 0 0-.041-.104c-.669-.252-1.304-.558-1.917-.892a.077.077 0 0 1-.008-.128c.129-.098.258-.2.381-.304a.074.074 0 0 1 .077-.01c4.014 1.83 8.36 1.83 12.326 0a.073.073 0 0 1 .078.009c.123.104.252.206.381.304a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.918.892.076.076 0 0 0-.04.105c.36.726.78 1.416 1.247 2.066a.076.076 0 0 0 .084.028c1.995-.627 4.036-1.567 6.139-3.115a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.637-3.548-13.625a.061.061 0 0 0-.03-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.944 2.419-2.157 2.419Z" fill="currentColor"/>
				</svg>
			</a>
			<!-- Theme Toggle -->
			<ThemeToggle />
			<!-- User menu - Pass down user and profile props with correct names -->
			<UserMenu userProp={user} profileProp={profile} />
		</div>
	</div>

	<!-- Mobile Navigation Drawer -->
	{#if isMobileMenuOpen}
		<div
			class="absolute top-3/4 left-0 right-0 mt-1 mx-2 p-4 rounded-xl shadow-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 lg:hidden z-50"
			role="dialog"
			aria-modal="true"
			transition:slide={{ duration: 150, axis: 'y' }}
			bind:this={mobileMenuNav}
			on:click|stopPropagation={() => {}}
		>
			<nav class="flex flex-col gap-3">
				{#each navLinks as link}
					{#if link.href === '/'}
						<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href={link.href}>
							{#if !NO_IMAGES}
								<img
									alt="PokéCards-Collector Logo"
									loading="eager"
									class="object-contain aspect-square h-7 w-7"
									src={pokecardsCollector}
								/>
							{/if}
							<span class="font-bold text-lg">{link.name}</span>
						</a>
					{:else if link.isDropdown && link.children}
						<!-- Mobile Dropdown Section -->
						<div class="border-t border-gray-700 pt-2 mt-1">
							<div class="flex items-center gap-2 px-2 py-1 text-gray-400 text-sm font-semibold">
								{#if !NO_IMAGES && link.icon}
									<svelte:component this={link.icon} size={16} />
								{/if}
								{link.name}
							</div>
							{#each link.children as child}
								<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 pl-6 rounded hover:bg-gray-600" href={child.href}>
									{#if !NO_IMAGES && child.icon}
										<svelte:component this={child.icon} size={18} />
									{/if}
									{child.name}
								</a>
							{/each}
						</div>
					{:else}
						<a class="mobile-nav-link text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded hover:bg-gray-600" href={link.href}>
							{#if !NO_IMAGES && link.icon}
								<svelte:component this={link.icon} size={20} />
							{/if}
							{link.name}
						</a>
					{/if}
				{/each}
			</nav>
		</div>
	{/if}
</header>

<style lang="postcss">
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
