<script lang="ts" module>
	/** Exported so the footer draws the same Discord mark. */
	export { discordLogo };
</script>

<script lang="ts">
	import { page } from '$app/state';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import UserMenu from '#components/auth/UserMenu.svelte';
	import SearchBar from '#components/SearchBar.svelte';
	import SearchModal from '#components/SearchModal.svelte';
	import pokecardsCollector from '#src/assets/pokecards-collector.png';
	import { afterNavigate } from '$app/navigation';
	import type { LucideIcon } from '@lucide/svelte';
	import CardStackIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import ArtistIcon from '@lucide/svelte/icons/paintbrush';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import BinderIcon from '@lucide/svelte/icons/book-open';
	import SearchUsersIcon from '@lucide/svelte/icons/users';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import Flag from '#components/Flag.svelte';
	import type { Language } from '#helpers/catalogues.ts';
	import PokedexIcon from '@lucide/svelte/icons/paw-print';
	import TrainersIcon from '@lucide/svelte/icons/backpack';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';
	import PriceGameIcon from '@lucide/svelte/icons/circle-euro';
	import GamepadIcon from '@lucide/svelte/icons/gamepad-2';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';

	interface NavLink {
		children?: NavLink[];
		description?: string;
		/** Drawn in place of `icon` for the catalogue entries. */
		flag?: Language;
		href?: string;
		icon: LucideIcon | null;
		isDropdown?: boolean;
		name: string;
	}

	const navLinks: NavLink[] = [
		{ description: 'PokéCards-Collector home', href: '/', icon: null, name: 'PCC' },
		{
			children: [
				{ description: 'Every Pokémon and its cards', href: '/pokemons', icon: PokedexIcon, name: 'Pokémons' },
				{ description: 'Every Trainer and Energy card, grouped', href: '/trainers', icon: TrainersIcon, name: 'Trainers & Energy' },
				{ description: 'Browse and filter every card', href: '/cards-list', icon: CardStackIcon, name: 'Cards' },
				{ description: 'Every set, grouped by series', href: '/sets', icon: LibraryIcon, name: 'Sets' },
				{ description: 'Every card illustrator', href: '/artists', icon: ArtistIcon, name: 'Artists' },
				{ description: 'The Japanese catalogue', flag: 'ja', href: '/japan', icon: null, name: 'Japan' },
				{ description: 'The French catalogue', flag: 'fr', href: '/france', icon: null, name: 'France' },
				{ description: 'Jump to a random card', href: '/random', icon: ShuffleIcon, name: 'Random Card' },
			],
			description: 'Browse the card database',
			icon: SearchIcon,
			isDropdown: true,
			name: 'Browse'
		},
		{
			children: [
				{ description: 'Guess the daily mystery card', href: '/card.dle', icon: PuzzleIcon, name: 'Card.dle' },
				{ description: 'Guess what a card is worth', href: '/guess-the-price', icon: PriceGameIcon, name: 'Guess The Price' },
			],
			description: 'Daily card games',
			icon: GamepadIcon,
			isDropdown: true,
			name: 'Games'
		},
		{ description: 'Lay out a digital binder page', href: '/binder', icon: BinderIcon, name: 'Binder' },
		{ description: 'Find other collectors', href: '/users', icon: SearchUsersIcon, name: 'Users' },
	];

	let isMobileMenuOpen = $state(false);
	let mobileMenuButton = $state<HTMLButtonElement>();
	let mobileMenuNav = $state<HTMLDivElement>();
	let openDropdown: string | null = $state(null);

	const user = $derived(page.data.user);
	const profile = $derived(page.data.profile);

	afterNavigate(() => {
		isMobileMenuOpen = false;
		openDropdown = null;
	});

	function handleClickOutside(event: MouseEvent) {
		if (isMobileMenuOpen && mobileMenuNav && mobileMenuButton) {
			const targetEl = event.target as Node;
			if (!mobileMenuNav.contains(targetEl) && !mobileMenuButton.contains(targetEl)) {
				isMobileMenuOpen = false;
			}
		}
		openDropdown = null;
	}

	function toggleDropdown(linkName: string) {
		openDropdown = openDropdown === linkName ? null : linkName;
	}

	const discordInviteUrl = 'https://discord.com/invite/7c7nzHqxJx';
</script>

<svelte:window onclick={handleClickOutside} />

{#snippet discordLogo(size: number, className?: string)}
	<svg aria-hidden="true" class={className} fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
		<path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.077.077 0 0 0-.082.038c-.357.63-.755 1.453-1.037 2.104a18.524 18.524 0 0 0-5.49 0 12.683 12.683 0 0 0-1.05-2.104.077.077 0 0 0-.082-.038A19.736 19.736 0 0 0 3.677 4.369a.069.069 0 0 0-.03.027C.533 9.09-.32 13.579.099 18.021a.082.082 0 0 0 .031.056c2.104 1.548 4.144 2.488 6.138 3.115a.077.077 0 0 0 .084-.027c.472-.65.893-1.34 1.248-2.066a.076.076 0 0 0-.041-.104c-.669-.252-1.304-.558-1.917-.892a.077.077 0 0 1-.008-.128c.129-.098.258-.2.381-.304a.074.074 0 0 1 .077-.01c4.014 1.83 8.36 1.83 12.326 0a.073.073 0 0 1 .078.009c.123.104.252.206.381.304a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.918.892.076.076 0 0 0-.04.105c.36.726.78 1.416 1.247 2.066a.076.076 0 0 0 .084.028c1.995-.627 4.036-1.567 6.139-3.115a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.637-3.548-13.625a.061.061 0 0 0-.03-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.944 2.419-2.157 2.419Z" />
	</svg>
{/snippet}

{#snippet logo(className: string)}
	{#if !NO_IMAGES}
		<img alt="PokéCards-Collector Logo" class={['object-contain aspect-square', className]} loading="eager" src={pokecardsCollector} />
	{/if}
{/snippet}

{#snippet discordLink(className: string)}
	<a
		aria-label="Join our Discord community"
		class={['items-center justify-center text-gray-400 hover:text-indigo-400 transition-colors duration-200 mr-1', className]}
		href={discordInviteUrl}
		rel="noopener noreferrer"
		target="_blank"
		title="Join our Discord community"
	>
		{@render discordLogo(28)}
	</a>
{/snippet}

<!-- The gradient band under the pill is decoration that overlaps the top of every page, so only the pill and the mobile menu take clicks. -->
<header class="pointer-events-none fixed top-0 left-0 w-full p-2 pb-6 lg:pb-12 z-50 bg-linear-to-b from-gray-900 to-transparent [view-transition-name:header]">
	<div class="pointer-events-auto relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full bg-gray-800">
		<div class="flex items-center gap-2">
			<button
				aria-label="Toggle menu"
				bind:this={mobileMenuButton}
				class="lg:hidden text-gray-400 hover:text-gold-400 transition-colors duration-200 p-1 -ml-1"
				onclick={event => { event.stopPropagation(); isMobileMenuOpen = !isMobileMenuOpen; }}
				title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
			>
				{#if isMobileMenuOpen}
					<XIcon size={24} />
				{:else}
					<MenuIcon size={24} />
				{/if}
			</button>
		</div>

		<nav class="hidden lg:flex items-center gap-4">
			{#each navLinks as link (link.name)}
				{#if link.href === '/'}
					<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2" href={link.href} title={link.description}>
						{@render logo('h-10 w-10')}
						<span class="font-bold text-lg">{link.name}</span>
					</a>
				{:else if link.isDropdown && link.children}
					<div class="relative">
						<button
							aria-expanded={openDropdown === link.name}
							class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1"
							onclick={event => { event.stopPropagation(); toggleDropdown(link.name); }}
							title={link.description}
						>
							{#if !NO_IMAGES && link.icon}
								<link.icon size={16} />
							{/if}
							{link.name}
							<ChevronDownIcon class="transition-transform duration-200 {openDropdown === link.name ? 'rotate-180' : ''}" size={14} />
						</button>

						{#if openDropdown === link.name}
							<div
								class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 min-w-48 z-10"
								transition:slide={{ axis: 'y', duration: 200 }}
							>
								{#each link.children as child (child.name)}
									<a
										class="flex items-center gap-2 whitespace-nowrap px-4 py-2 text-gray-300 hover:text-gold-400 hover:bg-gray-700 transition-colors duration-200"
										href={child.href}
										title={child.description}
									>
										{#if child.flag}
											<Flag class="h-[11px] w-4 shrink-0 rounded-[2px]" language={child.flag} />
										{:else if !NO_IMAGES && child.icon}
											<child.icon size={16} />
										{/if}
										{child.name}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<a class="nav-link text-gray-400 hover:text-gold-400 transition-colors duration-200 flex items-center gap-1" href={link.href} title={link.description}>
						{#if !NO_IMAGES && link.icon}
							<link.icon size={16} />
						{/if}
						{link.name}
					</a>
				{/if}
			{/each}
		</nav>

		<span class="flex-1 hidden lg:block"></span>

		<div class="flex items-center gap-2 xs:gap-4 max-sm:min-w-0 max-sm:flex-1">
			{@render discordLink('hidden sm:flex')}
			<div class="w-48 sm:w-60 md:w-72 lg:w-80 xl:w-96 max-sm:hidden">
				<SearchBar />
			</div>

			<SearchModal />
			{@render discordLink('flex sm:hidden')}
			<UserMenu />
		</div>
	</div>

	{#if isMobileMenuOpen}
		<div
			aria-modal="true"
			bind:this={mobileMenuNav}
			class="pointer-events-auto absolute top-3/4 left-0 right-0 mt-1 mx-2 p-4 rounded-xl shadow-lg bg-gray-800 lg:hidden z-50"
			role="dialog"
			tabindex="-1"
			transition:slide={{ axis: 'y', duration: 150 }}
		>
			<nav class="flex flex-col gap-3">
				{#each navLinks as link (link.name)}
					{#if link.href === '/'}
						<a class="text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded-sm hover:bg-gray-600" href={link.href} title={link.description}>
							{@render logo('h-7 w-7')}
							<span class="font-bold text-lg">{link.name}</span>
						</a>
					{:else if link.isDropdown && link.children}
						<div class="border-t border-gray-700 pt-2 mt-1">
							<div class="flex items-center gap-2 px-2 py-1 text-gray-400 text-sm font-semibold">
								{#if !NO_IMAGES && link.icon}
									<link.icon size={16} />
								{/if}
								{link.name}
							</div>
							{#each link.children as child (child.name)}
								<a class="text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 pl-6 rounded-sm hover:bg-gray-600" href={child.href} title={child.description}>
									{#if child.flag}
										<Flag class="h-3 w-[18px] shrink-0 rounded-[2px]" language={child.flag} />
									{:else if !NO_IMAGES && child.icon}
										<child.icon size={18} />
									{/if}
									{child.name}
								</a>
							{/each}
						</div>
					{:else}
						<a class="text-gray-300 hover:text-gold-400 transition-colors duration-200 flex items-center gap-2 p-2 rounded-sm hover:bg-gray-600" href={link.href} title={link.description}>
							{#if !NO_IMAGES && link.icon}
								<link.icon size={20} />
							{/if}
							{link.name}
						</a>
					{/if}
				{/each}
			</nav>
		</div>
	{/if}
</header>

<style>
	.nav-link {
		position: relative;
	}

	.nav-link::after {
		background-color: var(--color-gold-400);
		bottom: -4px;
		content: '';
		height: 2px;
		left: 0;
		position: absolute;
		transform: scaleX(0);
		transition: transform 0.3s ease;
		width: 100%;
	}

	.nav-link:hover::after {
		transform: scaleX(1);
	}
</style>
