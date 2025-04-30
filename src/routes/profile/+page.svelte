<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import type { PageData } from './$types';
	import type { Set } from '$lib/types';
	import Avatar from '$lib/components/auth/Avatar.svelte';
	import { NO_IMAGES } from '$lib/images';
	import { Home } from 'lucide-svelte';
	
	export let data: PageData;

	// State variables
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	// Reactive data from server
	$: allCards = data.allCards;
	$: sets = data.sets || [];
	$: prices = data.prices;
	$: targetProfile = data.targetProfile;
	$: isPublic = data.isPublic;
	$: collectionStats = data.collectionStats;
	$: isOwnProfile = data.isOwnProfile;
	$: loggedInUsername = data.loggedInUsername;
	$: pageTitle = data.title;
	$: description = data.description;

	// Toggle profile visibility
	async function handleToggleVisibility() {
		if (!$authStore.user || !$authStore.profile) return;

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const newVisibility = !$authStore.profile.is_public;
			const { data: updatedProfile, error } = await toggleProfileVisibility($authStore.profile.username, newVisibility);

			if (error) {
				errorMessage = `Failed to update profile visibility: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
				return;
			}

			if (updatedProfile) {
				authStore._update({ profile: updatedProfile });
				successMessage = `Profile visibility changed to ${newVisibility ? 'public' : 'private'}`;
			} else {
				errorMessage = 'No data returned from server after toggle';
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
	function formatCurrency(value: number | undefined | null): string {
		if (value === undefined || value === null) return 'N/A';
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
	function getSortedSets(): [string, { count: number; total: number; percentage: number; collectedValue: number; totalValue: number }][] {
		if (!collectionStats?.set_completion) return [];
		
		// Assert the correct type for Object.entries
		return (Object.entries(collectionStats.set_completion) as [string, { count: number; total: number; percentage: number; collectedValue: number; totalValue: number }][])
			.sort((a, b) => b[1].percentage - a[1].percentage);
	}

	// Simplified onMount - remove subscription and profile loading
	onMount(() => {
		// Example: If you need other client-side initialization, it goes here
		// Check if user *should* be logged in but isn't (e.g., session expired client-side)
		const urlParams = new URLSearchParams(window.location.search);
		const urlUsername = urlParams.get('user');
		if (!urlUsername && !loggedInUsername && browser) {
			// Trying to view own profile but not logged in according to server data
			// This might indicate an issue or just an anonymous user hitting /profile
			// Depending on desired behavior, could redirect to login
			// goto('/login'); 
		}

		// If needed, still check authStore state for UI elements not covered by server data
		const unsubscribe = authStore.subscribe(state => {
			if (!state.loading && state.user === null && !urlUsername && browser) {
				// If auth store confirms no user and we are on /profile, redirect
				goto('/');
			}
		});
		
		return unsubscribe; // Make sure to return unsubscribe
	});
</script>

<svelte:head>
	<!-- Use server-provided title and description -->
	<title>{pageTitle}</title>
	<meta name="description" content={description} />
	<!-- Removed client-side script for username mismatch check -->
</svelte:head>

<div class="w-full mx-auto pb-4 lg:pb-5">
	<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
		<PageTitle title={pageTitle} />
	</div>
	<div class="w-full max-w-[800px] mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
</div>

<div class="container mx-auto px-4 py-8">
	<!-- Conditional rendering based on server data -->
	{#if !targetProfile && data.title === 'User Not Found'}
		<!-- User Not Found -->
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p class="font-bold mb-4 text-4xl text-gold-400">
				{pageTitle} <!-- Display server title: User Not Found -->
			</p>
			<p class="mb-4">{description}</p>
			<a
				href="/"
				class="home-button animated-hover-button relative overflow-hidden border-2 border-gold-400 text-gold-400 text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 mt-4 hover:bg-gold-400 hover:text-black"
			>
				<span class="relative z-10 flex items-center gap-2">
					<Home size={16} />
					Return to Home
				</span>
			</a>
		</div>
	{:else if targetProfile && !isPublic && !isOwnProfile}
		<!-- Private Profile -->
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p class="font-bold mb-4 text-3xl text-gold-400">
				{pageTitle} <!-- Display server title: Private Profile -->
			</p>
			<p class="mb-4">{description}</p>
			<a
				href="/"
				class="home-button animated-hover-button relative overflow-hidden border-2 border-gold-400 text-gold-400 text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 mt-4 hover:bg-gold-400 hover:text-black"
			>
				<span class="relative z-10 flex items-center gap-2">
					<Home size={16} />
					Return to Home
				</span>
			</a>
		</div>
	{:else if !loggedInUsername && !targetProfile}
		<!-- Not logged in, trying to view own profile -->
		<div class="text-center p-8">
			<p class="text-lg">{description} <!-- Sign in to view your profile. --></p>
			<!-- Optionally add a login button here -->
		</div>
	{:else if targetProfile}
		<!-- Display Profile (Own or Public) -->
		
		<!-- Success message -->
		{#if successMessage}
			<div class="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
				<p>{successMessage}</p>
			</div>
		{/if}

		<!-- Error message for toggle -->
		{#if errorMessage}
			<div class="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
				<p>{errorMessage}</p>
			</div>
		{/if}

		<!-- Profile info and controls -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Profile Information -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-center gap-4 mb-6">
					<Avatar username={targetProfile.username} size="size-16 text-3xl" />
					<div>
						<h2 class="text-xl font-semibold dark:text-white">{targetProfile.username}</h2>
						{#if isOwnProfile && $authStore.user?.email}
							<p class="text-sm text-gray-500 dark:text-gray-400">{$authStore.user.email}</p>
						{/if}
					</div>
				</div>

				{#if isOwnProfile}
					<div class="border-t dark:border-gray-700 pt-4">
						<div class="mb-4">
							<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Profile visibility:</span>
							<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
								<!-- Use authStore state for real-time update after toggle -->
								{$authStore.profile?.is_public ? 'Public' : 'Private'}
							</span>
						</div>

						<button
							type="button"
							class="animated-hover-button relative overflow-hidden w-full py-2 px-4 border-2 border-gold-400 rounded-md text-sm font-medium text-gold-400 bg-transparent flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:text-black"
							on:click={handleToggleVisibility}
							disabled={isLoading}
						>
							<span class="relative z-10 flex items-center">
								{#if isLoading}
									<div class="loader-spin mr-2" style="width: 16px; height: 16px;">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M21 12a9 9 0 1 1-6.219-8.56"/>
										</svg>
									</div>
									Processing...
								{:else}
									{$authStore.profile?.is_public ? 'Make my profile private' : 'Make my profile public'}
								{/if}
							</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Quick links -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
				<h2 class="text-xl font-semibold mb-4 text-gold-400">{isOwnProfile ? 'My' : `${targetProfile.username}'s`} Collections</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<a
						href={isOwnProfile 
							? `/collection` 
							: `/collection?user=${encodeURIComponent(targetProfile.username)}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-transparent hover:border-gold-400"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">
							{isOwnProfile ? 'My Collection' : `${targetProfile.username}'s Collection`}
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Browse all collected cards</p>
					</a>

					<a
						href={isOwnProfile 
							? `/wishlist` 
							: `/wishlist?user=${encodeURIComponent(targetProfile.username)}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-transparent hover:border-gold-400"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">
							{isOwnProfile ? 'My Wishlist' : `${targetProfile.username}'s Wishlist`}
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Cards to be acquired</p>
					</a>
				</div>
			</div>
		</div>

		<!-- Collection Stats Section -->
		{#if collectionStats}
			<div class="mt-8">
				<h2 class="text-xl font-semibold mb-2 text-gold-400">Collection Stats</h2>
				<div class="w-full max-w-[200px] h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent mb-4"></div>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
					<!-- Collection Overview Card -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 text-gold-400">Overview</h3>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Unique Cards:</span>
								<span class="font-medium dark:text-white">{collectionStats.unique_cards ?? 0}/{allCards.length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Total Cards:</span>
								<span class="font-medium dark:text-white">{collectionStats.total_instances ?? 0}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Wishlist Cards:</span>
								<span class="font-medium dark:text-white">{collectionStats.wishlist_count ?? 0}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Sets in Collection:</span>
								<span class="font-medium dark:text-white">{Object.keys(collectionStats.set_completion ?? {}).length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-gray-400">Total Value:</span>
								<span class="font-medium dark:text-white">{formatCurrency(collectionStats.total_value)}</span>
							</div>
						</div>
					</div>

					<!-- Cards by Rarity Card -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 text-gold-400">Cards by Rarity</h3>
						<div class="space-y-2">
							{#each Object.entries(collectionStats.cards_by_rarity ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5) as [rarity, count]}
								<div class="flex justify-between items-center">
									<span class="text-gray-500 dark:text-gray-400">{rarity}</span>
									<span class="font-medium dark:text-white">{count}</span>
								</div>
							{:else}
								<p class="text-gray-500 dark:text-gray-400 text-center">No rarity data available</p>
							{/each}
							
							{#if Object.entries(collectionStats.cards_by_rarity ?? {}).length > 5}
								<div class="text-center mt-2 text-sm text-gray-500">
									+ {Object.entries(collectionStats.cards_by_rarity ?? {}).length - 5} more
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Collection Summary -->
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 class="text-lg font-semibold mb-4 text-gold-400">Collection Info</h3>
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
					<h3 class="text-lg font-semibold mb-4 text-gold-400">Set Completion</h3>
					
					{#if getSortedSets().length === 0}
						<p class="text-gray-500 dark:text-gray-400 text-center py-4">No set completion data available</p>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each getSortedSets() as [setName, stats]}
								{@const set = getSetByName(setName)}
								<div class="border dark:border-gray-700 rounded-lg p-4 hover:border-gold-400 transition-colors">
									<div class="flex items-center mb-2">
										{#if !NO_IMAGES && set?.logo}
											<img src={set.logo} alt={setName} class="h-6 mr-2" />
										{:else if NO_IMAGES && set?.logo}
											<!-- Placeholder for the image -->
											<div class="h-6 w-6 mr-2 bg-gray-300 dark:bg-gray-600 rounded"></div>
										{/if}
										<h4 class="font-medium text-sm dark:text-white truncate">{setName}</h4>
									</div>
									
									<div class="flex justify-between text-sm mb-1">
										<span class="text-gray-500 dark:text-gray-400">Value:</span>
										<span class="font-medium dark:text-white">{formatCurrency(stats.collectedValue)} / {formatCurrency(stats.totalValue)}</span>
									</div>
									
									<div class="mt-2">
										<div class="flex justify-between text-sm mb-1">
											<span class="text-gray-500 dark:text-gray-400">{stats.count} / {stats.total} cards</span>
											<span class="font-medium dark:text-white">{stats.percentage.toFixed(2)}%</span>
										</div>
										<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
											<div class="bg-gold-400 h-2 rounded-full" style="width: {stats.percentage}%"></div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if !targetProfile && !isOwnProfile} 
			<!-- Catch-all for potentially unloaded profile state -->
			<div class="mt-8 text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
				<p class="text-gray-500 dark:text-gray-400">Profile data is loading or not available.</p>
			</div>
		{/if}
	{:else}
		<!-- Fallback for unexpected states, e.g., targetProfile is null but title isn't 'User Not Found' -->
		<div class="text-center p-8">
			<p class="text-lg">Unable to display profile information.</p>
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
	
	:global(html) {
		--gold-400: #fbc54a;
	}

	.animated-hover-button::before {
		background-color: var(--gold-400);
		bottom: 0;
		content: '';
		height: 0;
		left: 0;
		position: absolute;
		transition: height 0.3s ease-in-out;
		width: 100%;
		z-index: 0;
	}

	.animated-hover-button:not(:disabled):hover::before {
		height: 100%;
	}
	
	.animated-hover-button:disabled::before {
		display: none;
	}
</style>
