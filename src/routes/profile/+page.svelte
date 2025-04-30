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
	import { Home, UserCog, BookOpen, ListTodo } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	
	export let data: PageData;

	// State variables
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let ready = false;

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

	// Utilités pour les statistiques
	function getTotalCards(): number {
		return collectionStats?.total_instances || 0;
	}
	
	function getUniqueCards(): number {
		return collectionStats?.unique_cards || 0;
	}
	
	function getWishlistCount(): number {
		return collectionStats?.wishlist_count || 0;
	}
	
	function getUniqueSets(): number {
		return collectionStats?.set_completion ? Object.keys(collectionStats.set_completion).length : 0;
	}
	
	function getCompletionPercentage(): number {
		if (!collectionStats?.set_completion) return 0;
		const sets = Object.values(collectionStats.set_completion);
		if (sets.length === 0) return 0;
		
		const totalPercentage = sets.reduce((sum, set) => sum + set.percentage, 0);
		return totalPercentage / sets.length;
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
		
		ready = true;
		return unsubscribe; // Make sure to return unsubscribe
	});
	
	// Animation for stats numbers
	const bounceAnimation = {
		duration: 1000,
		iterationCount: 'infinite',
		direction: 'alternate',
		easing: 'cubic-bezier(0.5, 0, 0.5, 1)'
	};
</script>

<svelte:head>
	<!-- Use server-provided title and description -->
	<title>{pageTitle}</title>
	<meta name="description" content={description} />
	<!-- Removed client-side script for username mismatch check -->
</svelte:head>

<main class="container mx-auto px-4 pb-8 text-white overflow-x-hidden">
	<div class="w-full mx-auto pb-4 lg:pb-5">
		<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
			<PageTitle title={pageTitle} />
		</div>
		<div class="w-full max-w-[800px] mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
	</div>

	<!-- Conditional rendering based on server data -->
	{#if ready}
		{#if !targetProfile && data.title === 'User Not Found'}
			<!-- User Not Found -->
			<div class="text-center p-8 flex flex-col items-center justify-center flex-grow" in:fly={{ y: 20, duration: 500, delay: 100 }} out:fade={{ duration: 200 }}>
				<p class="font-bold mb-4 text-4xl text-gold-400">
					{pageTitle} <!-- Display server title: User Not Found -->
				</p>
				<p class="mb-4 text-gray-300">{description}</p>
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
			<div class="text-center p-8 flex flex-col items-center justify-center flex-grow" in:fly={{ y: 20, duration: 500, delay: 100 }} out:fade={{ duration: 200 }}>
				<p class="font-bold mb-4 text-3xl text-gold-400">
					{pageTitle} <!-- Display server title: Private Profile -->
				</p>
				<p class="mb-4 text-gray-300">{description}</p>
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
			<div class="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl my-10 border border-gold-600/30" in:fade={{ duration: 700, delay: 500 }} out:fade={{ duration: 200 }}>
				<p class="text-xl text-gold-400 font-bold mb-4">{description}</p>
				<div class="flex flex-wrap justify-center gap-4 mt-6">
					<a href="/login" class="px-6 py-3 bg-gold-400 text-black font-bold rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900">
						Log In
					</a>
					<a href="/signup" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
						Sign Up
					</a>
				</div>
			</div>
		{:else}
			<!-- Display Profile (Own or Public) -->
			
			<!-- Success message -->
			{#if successMessage}
				<div class="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded" in:fly={{ y: -20, duration: 300 }}>
					<p>{successMessage}</p>
				</div>
			{/if}

			<!-- Error message for toggle -->
			{#if errorMessage}
				<div class="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded" in:fly={{ y: -20, duration: 300 }}>
					<p>{errorMessage}</p>
				</div>
			{/if}

			<!-- Profile info and controls -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
				<!-- Profile Information -->
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6" in:fly={{ y: 20, duration: 500, delay: 100 }} out:fade={{ duration: 200 }}>
					<div class="flex items-center gap-4 mb-6">
						<Avatar username={targetProfile.username} size="size-16 text-3xl" />
						<div>
							<h2 class="text-xl font-semibold text-gold-400">{targetProfile.username}</h2>
							{#if isOwnProfile && $authStore.user?.email}
								<p class="text-sm text-gray-400">{$authStore.user.email}</p>
							{/if}
						</div>
					</div>

					{#if isOwnProfile}
						<div class="border-t border-gray-700 pt-4">
							<div class="mb-4">
								<span class="text-sm font-medium text-gray-400">Profile visibility:</span>
								<span class="ml-2 text-sm text-gold-400">
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
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 lg:col-span-2" in:fly={{ y: 20, duration: 500, delay: 200 }} out:fade={{ duration: 200 }}>
					<h2 class="text-xl font-semibold mb-4 text-gold-400">{isOwnProfile ? 'My' : `${targetProfile.username}'s`} Collections</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<a
							href={isOwnProfile 
								? `/collection` 
								: `/collection?user=${encodeURIComponent(targetProfile.username)}`}
							class="block p-6 bg-gray-800/60 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
						>
							<div class="flex items-center gap-3">
								<BookOpen size={20} class="text-gold-400" />
								<h3 class="text-lg font-medium text-white">
									{isOwnProfile ? 'My Collection' : `${targetProfile.username}'s Collection`}
								</h3>
							</div>
							<p class="text-sm text-gray-400 mt-2">Browse all collected cards</p>
						</a>

						<a
							href={isOwnProfile 
								? `/wishlist` 
								: `/wishlist?user=${encodeURIComponent(targetProfile.username)}`}
							class="block p-6 bg-gray-800/60 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
						>
							<div class="flex items-center gap-3">
								<ListTodo size={20} class="text-gold-400" />
								<h3 class="text-lg font-medium text-white">
									{isOwnProfile ? 'My Wishlist' : `${targetProfile.username}'s Wishlist`}
								</h3>
							</div>
							<p class="text-sm text-gray-400 mt-2">Cards to be acquired</p>
						</a>
						
						{#if isOwnProfile}
							<a
								href="/settings"
								class="block p-6 bg-gray-800/60 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
							>
								<div class="flex items-center gap-3">
									<UserCog size={20} class="text-gold-400" />
									<h3 class="text-lg font-medium text-white">Account Settings</h3>
								</div>
								<p class="text-sm text-gray-400 mt-2">Manage your account preferences</p>
							</a>
						{/if}
					</div>
				</div>
			</div>

			<!-- Collection Stats Section -->
			{#if collectionStats && (isPublic || isOwnProfile)}
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 mb-10" in:fly={{ y: 20, duration: 500, delay: 300 }} out:fade={{ duration: 200 }}>
					<h2 class="text-xl font-semibold mb-6 text-gold-400">Collection Statistics</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 mb-8">
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{getTotalCards()}</span>
							<span class="text-sm text-gray-400">Total Cards</span>
						</div>
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{getUniqueCards()}</span>
							<span class="text-xs text-gray-500">/ {allCards.length || 0}</span>
							<span class="text-sm text-gray-400">Unique Cards</span>
						</div>
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{getWishlistCount()}</span>
							<span class="text-sm text-gray-400">Wishlist Cards</span>
						</div>
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{getUniqueSets()}</span>
							<span class="text-sm text-gray-400">Different Sets</span>
						</div>
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{formatCurrency(collectionStats.total_value || 0)}</span>
							<span class="text-sm text-gray-400">Collection Value</span>
						</div>
						<div class="text-center">
							<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{getCompletionPercentage().toFixed(1)}%</span>
							<span class="text-sm text-gray-400">Total Completion</span>
						</div>
					</div>

					<!-- Top completed sets -->
					{#if collectionStats.set_completion && Object.keys(collectionStats.set_completion).length > 0}
						<h3 class="text-lg font-semibold mb-4 text-white">Top Completed Sets</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each getSortedSets().slice(0, 6) as [setName, setData]}
								{@const set = getSetByName(setName)}
								<div class="bg-gray-800/60 rounded-lg p-4 border border-transparent hover:border-gold-400 transition-all duration-300">
									<div class="flex justify-between items-center mb-2">
										<div class="flex items-center gap-2">
											{#if !NO_IMAGES && set?.logo}
												<img src={set.logo} alt={setName} class="h-6 w-auto" />
											{/if}
											<h4 class="font-medium text-white">{setName}</h4>
										</div>
										<span class="text-sm text-gold-400">{setData.percentage.toFixed(1)}%</span>
									</div>
									<div class="w-full bg-gray-700 rounded-full h-2.5 mb-4">
										<div class="bg-gold-400 h-2.5 rounded-full" style="width: {setData.percentage}%"></div>
									</div>
									<div class="flex justify-between text-xs text-gray-400">
										<span>{setData.count} / {setData.total} cards</span>
										<span>Value: {formatCurrency(setData.collectedValue)}</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400">No set completion data available.</p>
					{/if}
				</div>
			{:else if !targetProfile && !isOwnProfile} 
				<!-- Catch-all for potentially unloaded profile state -->
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 text-center" in:fade={{ duration: 300 }}>
					<p class="text-gray-400">Profile data is loading or not available.</p>
				</div>
			{/if}
		{/if}
	{:else}
		<!-- Pas de placeholder de chargement, la barre de progression en haut suffit -->
	{/if}
</main>

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
