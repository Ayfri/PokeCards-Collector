<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { getCollectionStats } from '$lib/services/collections';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import type { PageData } from './$types';
	import type { CollectionStats, Set, UserProfile } from '$lib/types';
	import { page } from '$app/stores';
	import Avatar from '$lib/components/auth/Avatar.svelte';

	export let data: PageData;

	// State variables
	let isLoading = false;
	let collectionStats: CollectionStats | null = null;
	let errorMessage: string | null = null;
	let loggedInUser: UserProfile | null = null;
	let isOwnProfile = false;
	let profileNotFound = false;
	let profileIsPrivate = false;
	let pageTitleDisplay = data.title;

	// Reactive data from server
	$: sets = data.sets || [];
	$: targetProfile = data.targetProfile;
	$: isPublic = data.isPublic;
	$: serverCollectionStats = data.collectionStats;
	$: targetUsername = data.targetUsername;

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

	async function loadData() {
		if (!loggedInUser) return;
		
		isLoading = true;
		errorMessage = null;
		profileNotFound = false;
		profileIsPrivate = false;
		
		// Get the user parameter from the URL
		const urlParams = new URLSearchParams($page.url.search);
		const urlUsername = urlParams.get('user');
		
		if (urlUsername) {
			// Viewing specific user's collection
			isOwnProfile = loggedInUser?.username === urlUsername;
			
			if (!targetProfile) {
				errorMessage = `User "${urlUsername}" not found.`;
				pageTitleDisplay = 'User Not Found';
				profileNotFound = true;
				isLoading = false;
				return;
			} else if (!isPublic && !isOwnProfile) {
				errorMessage = `Collection for "${urlUsername}" is private.`;
				pageTitleDisplay = 'Private Collection';
				profileIsPrivate = true;
				isLoading = false;
				return;
			} else {
				// Profile is public or own profile
				collectionStats = serverCollectionStats;
				pageTitleDisplay = isOwnProfile 
					? 'My Collection Summary'
					: `${urlUsername}'s Collection Summary`;
			}
		} else {
			// Viewing own collection
			isOwnProfile = true;
			pageTitleDisplay = 'My Collection Summary';
			
			if (loggedInUser) {
				try {
					const { data: stats, error } = await getCollectionStats(loggedInUser.username);
					if (error) {
						errorMessage = `Failed to load collection stats: ${error}`;
					} else {
						collectionStats = stats;
					}
				} catch (err) {
					errorMessage = `An error occurred: ${err}`;
				}
			} else {
				goto('/');
				return;
			}
		}
		
		isLoading = false;
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe(async (state) => {
			if (!state.loading) {
				loggedInUser = state.profile;
				await loadData();
			}
		});

		return unsubscribe;
	});
</script>

<div class="w-full mx-auto pb-4 lg:pb-5">
	<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
		<PageTitle title={pageTitleDisplay} />
	</div>
</div>

<div class="container mx-auto px-4 py-6">
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
	{:else if isLoading}
		<div class="flex justify-center py-12">
			<div class="loader-spin" style="width: 40px; height: 40px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12a9 9 0 1 1-6.219-8.56"/>
				</svg>
			</div>
		</div>
	{:else if errorMessage}
		<div class="text-center p-8">
			<p class="text-lg text-red-500">{errorMessage}</p>
		</div>
	{:else if collectionStats}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Header/User info -->
			<div class="lg:col-span-3 flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-center mb-4 sm:mb-0">
					{#if targetProfile}
						<Avatar username={targetProfile.username} size={12} />
						<div class="ml-4">
							<h2 class="text-xl font-semibold dark:text-white">{targetProfile.username}'s Collection</h2>
						</div>
					{:else if loggedInUser}
						<Avatar username={loggedInUser.username} size={12} />
						<div class="ml-4">
							<h2 class="text-xl font-semibold dark:text-white">My Collection</h2>
						</div>
					{/if}
				</div>
				<a 
					href={targetUsername 
						? `/collection?user=${encodeURIComponent(targetUsername)}` 
						: '/collection'} 
					class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					View Full Collection
				</a>
			</div>

			<!-- Collection Overview Card -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold mb-4 dark:text-white">Collection Overview</h3>
				<div class="space-y-4">
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Total Cards:</span>
						<span class="font-medium dark:text-white">{collectionStats.total_cards}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Collection Value:</span>
						<span class="font-medium dark:text-white">{formatCurrency(collectionStats.total_value)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Sets in Collection:</span>
						<span class="font-medium dark:text-white">{Object.keys(collectionStats.set_completion).length}</span>
					</div>
				</div>
			</div>

			<!-- Cards by Rarity Card -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold mb-4 dark:text-white">Cards by Rarity</h3>
				<div class="space-y-2">
					{#each Object.entries(collectionStats.cards_by_rarity).sort((a, b) => b[1] - a[1]) as [rarity, count]}
						<div class="flex justify-between items-center">
							<span class="text-gray-500 dark:text-gray-400">{rarity}</span>
							<span class="font-medium dark:text-white">{count}</span>
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400 text-center">No rarity data available</p>
					{/each}
				</div>
			</div>
			
			<!-- Most Valuable Card (placeholder) -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold mb-4 dark:text-white">Collection Stats</h3>
				<div class="space-y-4">
					<p class="text-gray-500 dark:text-gray-400">
						Explore your collection's stats and completion rates below.
					</p>
					<p class="text-gray-500 dark:text-gray-400">
						Keep adding cards to increase your set completion percentage!
					</p>
				</div>
			</div>

			<!-- Set Completion Stats -->
			<div class="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
	{:else}
		<div class="text-center p-8">
			<p class="text-lg">No collection data available.</p>
		</div>
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