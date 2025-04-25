<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import { getCollectionStats } from '$lib/services/collections';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import type { CollectionStats, Set, UserProfile } from '$lib/types';
	import Avatar from '$lib/components/auth/Avatar.svelte';

	export let data: PageData;

	// State variables
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let collectionStats: CollectionStats | null = null;
	let loggedInUser: UserProfile | null = null;
	let isOwnProfile = false;
	let profileNotFound = false;
	let profileIsPrivate = false;
	let pageTitle = 'My Profile';
	let lastUsername = ''; // Track the last username we loaded
	
	// Reactive data from server
	$: allCards = data.allCards;
	$: sets = data.sets || [];
	$: prices = data.prices;
	$: targetProfile = data.targetProfile;
	$: isPublic = data.isPublic;
	$: serverCollectionStats = data.collectionStats;
	$: targetUsername = data.targetUsername;
	
	// React to data and URL changes
	$: {
		const urlUsername = $page.url.searchParams.get('user');
		
		// If we're viewing a different profile than before, force a reload
		if (browser && urlUsername !== lastUsername && lastUsername !== '') {
			window.location.href = `/profile?user=${encodeURIComponent(urlUsername || '')}`;
		}
		
		if (loggedInUser) {
			loadProfileData();
		}
	}
	
	// Toggle profile visibility
	async function handleToggleVisibility() {
		if (!$authStore.user || !$authStore.profile) return;

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const isPublic = !$authStore.profile.is_public;
			const { data, error } = await toggleProfileVisibility($authStore.profile.username, isPublic);

			if (error) {
				errorMessage = `Failed to update profile visibility: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
				return;
			}

			if (data) {
				authStore._update({ profile: data });
				successMessage = `Profile visibility changed to ${isPublic ? 'public' : 'private'}`;
			} else {
				errorMessage = 'No data returned from server';
			}
		} catch (error) {
			errorMessage = `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
		} finally {
			isLoading = false;

			// Auto-hide success message after 3 seconds
			if (successMessage) {
				setTimeout(() => {
					successMessage = '';
				}, 3000);
			}
		}
	}

	// Format currency for display
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'EUR'
		}).format(value);
	}

	// Get set object by name
	function getSetByName(setName: string): Set | undefined {
		return sets.find(set => set.name === setName);
	}

	// Sort sets by completion percentage (descending)
	function getSortedSets(): [string, { count: number; total: number; percentage: number }][] {
		if (!collectionStats || !collectionStats.set_completion) return [];
		
		return Object.entries(collectionStats.set_completion)
			.sort((a, b) => b[1].percentage - a[1].percentage);
	}

	// Handle clicks on My Profile from user menu
	function handleMyProfileClick() {
		if (loggedInUser && loggedInUser.username) {
			const currentUsername = new URLSearchParams($page.url.search).get('user');
			
			// Only navigate if we're not already viewing our own profile
			if (currentUsername !== loggedInUser.username) {
				goto(`/profile?user=${encodeURIComponent(loggedInUser.username)}`, { invalidateAll: true });
			}
		}
	}

	async function loadProfileData() {
		if (!loggedInUser) return;
		
		profileNotFound = false;
		profileIsPrivate = false;
		
		// Get the user parameter from the URL
		const urlParams = new URLSearchParams($page.url.search);
		const urlUsername = urlParams.get('user');
		lastUsername = urlUsername || ''; // Update the tracked username
		
		if (urlUsername) {
			// Viewing specific user's profile
			isOwnProfile = loggedInUser?.username === urlUsername;
			pageTitle = isOwnProfile ? 'My Profile' : `${urlUsername}'s Profile`;
			
			if (!targetProfile) {
				errorMessage = `User "${urlUsername}" not found.`;
				pageTitle = 'User Not Found';
				profileNotFound = true;
				return;
			} else if (!isPublic && !isOwnProfile) {
				errorMessage = `Profile for "${urlUsername}" is private.`;
				pageTitle = 'Private Profile';
				profileIsPrivate = true;
				return;
			} else {
				// Profile is public or own profile
				collectionStats = serverCollectionStats;
			}
		} else {
			// Viewing own profile
			isOwnProfile = true;
			pageTitle = 'My Profile';
			
			if (loggedInUser) {
				try {
					const { data: stats, error } = await getCollectionStats(loggedInUser.username, allCards, sets, prices);
					if (error) {
						console.error('Failed to load collection stats:', error);
					} else {
						collectionStats = stats;
					}
				} catch (err) {
					console.error('Error loading collection stats:', err);
				}
			} else {
				goto('/');
				return;
			}
		}
	}

	// Add link modifiers to force page reload
	function modifyProfileLinks() {
		if (!browser) return;
		
		// Modify all profile links to force a page reload
		document.querySelectorAll('a[href^="/profile"]').forEach(link => {
			link.setAttribute('target', '_self');
		});
	}

	afterUpdate(() => {
		modifyProfileLinks();
	});

	// Check if user is logged in and load profile data
	onMount(() => {
		// Override the link in the user menu to use our handler
		setTimeout(() => {
			const myProfileLink = document.querySelector('a[href^="/profile?user="]');
			if (myProfileLink) {
				myProfileLink.addEventListener('click', (e) => {
					e.preventDefault();
					handleMyProfileClick();
				});
			}
		}, 500);
		
		const unsubscribe = authStore.subscribe(async (state) => {
			if (!state.loading) {
				loggedInUser = state.profile;
				
				if (state.user === null) {
					goto('/');
					return;
				}
				
				await loadProfileData();
				modifyProfileLinks();
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	{#if browser}
		<script>
			// Script executed on the client side
			document.addEventListener('DOMContentLoaded', function() {
				// Get the displayed username from the page
				const displayedUsername = document.querySelector('h2.text-xl')?.textContent?.trim() || '';
				// Get the requested username from the URL
				const urlParams = new URLSearchParams(window.location.search);
				const urlUsername = urlParams.get('user');
				
				// If there's a mismatch, force reload the page
				if (urlUsername && displayedUsername && !displayedUsername.includes(urlUsername)) {
					window.location.reload();
				}
			});
		</script>
	{/if}
</svelte:head>

<div class="w-full mx-auto pb-4 lg:pb-5">
	<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
		<PageTitle title={pageTitle} />
	</div>
</div>

<div class="container mx-auto px-4 py-8">
	{#if profileNotFound || profileIsPrivate}
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p class="font-bold mb-4 {errorMessage?.includes('not found') ? 'text-4xl' : 'text-3xl'}">
				{errorMessage}
			</p>
			<a
				href="/"
				class="home-button animated-hover-button relative overflow-hidden bg-transparent border-2 border-white text-white text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 mt-4"
			>
				<span class="relative z-10 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
						<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
					Return to Home
				</span>
			</a>
		</div>
	{:else if !$authStore.user || !$authStore.profile}
		<div class="text-center p-8">
			<p class="text-lg">Please sign in to view your profile.</p>
		</div>
	{:else}
		<!-- Success message -->
		{#if successMessage}
			<div class="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
				<p>{successMessage}</p>
			</div>
		{/if}

		<!-- Error message -->
		{#if errorMessage && !profileNotFound && !profileIsPrivate}
			<div class="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
				<p>{errorMessage}</p>
			</div>
		{/if}

		<!-- Profile info and controls -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Profile Information -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-center gap-4 mb-6">
					{#if isOwnProfile}
						<Avatar username={$authStore.profile.username} size="size-16 text-3xl" />
						<div>
							<h2 class="text-xl font-semibold dark:text-white">{$authStore.profile.username}</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">{$authStore.user.email}</p>
						</div>
					{:else if targetProfile}
						<Avatar username={targetProfile.username} size="size-16 text-3xl" />
						<div>
							<h2 class="text-xl font-semibold dark:text-white">{targetProfile.username}</h2>
						</div>
					{/if}
				</div>

				{#if isOwnProfile}
					<div class="border-t dark:border-gray-700 pt-4">
						<div class="mb-4">
							<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Profile visibility:</span>
							<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
								{$authStore.profile.is_public ? 'Public' : 'Private'}
							</span>
						</div>

						<button
							type="button"
							class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
							on:click={handleToggleVisibility}
							disabled={isLoading}
						>
							{#if isLoading}
								<div class="loader-spin mr-2" style="width: 16px; height: 16px;">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M21 12a9 9 0 1 1-6.219-8.56"/>
									</svg>
								</div>
								Processing...
							{:else}
								{$authStore.profile.is_public ? 'Make my profile private' : 'Make my profile public'}
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<!-- Quick links -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
				<h2 class="text-xl font-semibold mb-4 dark:text-white">My Collections</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<a
						href={isOwnProfile 
							? `/collection` 
							: `/collection?user=${encodeURIComponent(targetUsername || '')}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">
							{isOwnProfile ? 'My Collection' : `${targetUsername}'s Collection`}
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Browse all collected cards</p>
					</a>

					<a
						href={isOwnProfile 
							? `/wishlist` 
							: `/wishlist?user=${encodeURIComponent(targetUsername || '')}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">
							{isOwnProfile ? 'My Wishlist' : `${targetUsername}'s Wishlist`}
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Cards to be acquired</p>
					</a>
				</div>
			</div>
		</div>

		<!-- Collection Stats Section -->
		{#if collectionStats}
			<div class="mt-8">
				<h2 class="text-xl font-semibold mb-4 dark:text-white">Collection Stats</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
					<!-- Collection Overview Card -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 dark:text-white">Overview</h3>
						<div class="space-y-4">
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Total Cards:</span>
								<span class="font-medium dark:text-white">{collectionStats.total_cards}/{allCards.length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Wishlist Cards:</span>
								<span class="font-medium dark:text-white">{collectionStats.wishlist_count}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Sets in Collection:</span>
								<span class="font-medium dark:text-white">{Object.keys(collectionStats.set_completion).length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Total Value:</span>
								<span class="font-medium dark:text-white">{formatCurrency(collectionStats.total_value)}</span>
							</div>
						</div>
					</div>

					<!-- Cards by Rarity Card -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 dark:text-white">Cards by Rarity</h3>
						<div class="space-y-2">
							{#each Object.entries(collectionStats.cards_by_rarity).sort((a, b) => b[1] - a[1]).slice(0, 5) as [rarity, count]}
								<div class="flex justify-between items-center">
									<span class="text-gray-500 dark:text-gray-400">{rarity}</span>
									<span class="font-medium dark:text-white">{count}</span>
								</div>
							{:else}
								<p class="text-gray-500 dark:text-gray-400 text-center">No rarity data available</p>
							{/each}
							
							{#if Object.entries(collectionStats.cards_by_rarity).length > 5}
								<div class="text-center mt-2 text-sm text-gray-500">
									+ {Object.entries(collectionStats.cards_by_rarity).length - 5} more
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Collection Summary -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 dark:text-white">Collection Info</h3>
						<div class="space-y-4">
							<p class="text-gray-500 dark:text-gray-400">
								Below you can see your set completion rates.
							</p>
							<p class="text-gray-500 dark:text-gray-400">
								Only sets with at least one card are shown.
							</p>
						</div>
					</div>
				</div>

				<!-- Set Completion Section -->
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold mb-4 dark:text-white">Set Completion</h3>
					
					{#if getSortedSets().length === 0}
						<p class="text-gray-500 dark:text-gray-400 text-center py-4">No set completion data available</p>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each getSortedSets() as [setName, stats]}
								{@const set = getSetByName(setName)}
								<div class="border dark:border-gray-700 rounded-lg p-4">
									<div class="flex items-center mb-2">
										{#if set?.logo}
											<img src={set.logo} alt={setName} class="h-6 mr-2" />
										{/if}
										<h4 class="font-medium text-sm dark:text-white truncate">{setName}</h4>
									</div>
									
									<div class="mt-2">
										<div class="flex justify-between text-sm mb-1">
											<span class="text-gray-500 dark:text-gray-400">{stats.count} / {stats.total} cards</span>
											<span class="font-medium dark:text-white">{stats.percentage}%</span>
										</div>
										<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
											<div class="bg-red-600 h-2 rounded-full" style="width: {stats.percentage}%"></div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if !profileNotFound && !profileIsPrivate}
			<div class="mt-8 text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
				<p class="text-gray-500 dark:text-gray-400">No collection data available.</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.loader-spin {
		animation: spin 2s linear infinite;
		display: inline-flex;
	}
</style>
