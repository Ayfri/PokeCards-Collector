<script lang="ts">
	import {page} from '$app/state';
	import {NO_IMAGES} from '$lib/images';
	import type {FullCard, Set, PriceData} from '$lib/types';
	import UserMenu from '@components/auth/UserMenu.svelte';
	import SearchBar from '@components/SearchBar.svelte';
	import SearchModal from '@components/SearchModal.svelte';
	import pokestore from '~/assets/pokestore.png';

	// Use allCards from layout data instead of page-specific data
	$: prices = page.data.prices as Record<string, PriceData> || {};
	$: allCards = page.data.allCards as FullCard[] || [];
	$: sets = page.data.sets as Set[] || [];
</script>

<header class="w-full p-2 pb-6 lg:pb-12">
	<div class="relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full z-50 bg-gray-800">
		<a class="nav-link max-xs:text-sm text-gray-400 hover:text-gold-400 transition-colors duration-200" href="/">Cards</a>
		<a class="nav-link max-xs:text-sm text-gray-400 hover:text-gold-400 transition-colors duration-200" href="/sets">Sets</a>
		<a class="nav-link max-xs:text-sm text-gray-400 hover:text-gold-400 transition-colors duration-200" href="/artists">Artists</a>
		<a class="nav-link max-xs:text-sm text-gray-400 hover:text-gold-400 transition-colors duration-200" href="/random">Random Card</a>
		<span class="flex-1"></span>
		<a class="logo-link absolute left-1/2 top-full xs:top-3/4 lg:top-full -translate-x-1/2 -translate-y-1/2 p-2 lg:p-2.5 rounded-full z-20" href="/">
			{#if !NO_IMAGES}
				<img
					alt="logo"
					loading="eager"
					class="object-contain aspect-square size-10 xs:size-12 lg:size-16"
					src={pokestore}
				/>
			{/if}
		</a>
		<!-- Search on desktop: visible on sm screens and up -->
		<div class="w-60 sm:w-80 md:w-96 max-sm:hidden">
			<SearchBar {allCards} {prices} {sets} />
		</div>

		<!-- Mobile search using the Svelte component -->
		<SearchModal {allCards} {prices} {sets}/>

		<!-- User menu -->
		<UserMenu/>
	</div>
</header>

<style lang="postcss">
	.logo-link {
		background-image: linear-gradient(transparent 50%, theme(textColor.gray.800) 50%);
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
