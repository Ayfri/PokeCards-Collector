<script lang="ts">
	import { onMount } from 'svelte';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import PageTitle from '@components/PageTitle.svelte';
	import type { Set } from '$lib/types';
	import Avatar from '@components/auth/Avatar.svelte';
	import { NO_IMAGES } from '$lib/images';
	import { Home, UserCog, BookOpen, ListTodo, ChevronRight } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';

	export let data: PageData;

	// Component state
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let ready = false;

	// Reactive data from page store
	$: ({ allCards, sets, targetProfile, isPublic, collectionStats, isOwnProfile, loggedInUsername, title: pageTitle, description } = data);
	$: user = data.user;
	$: profile = data.profile;

	// Profile visibility state, initialized from server data
	let currentVisibility = isPublic;
	$: currentVisibility = isPublic;

	// Calculate total completion percentage reactively
	$: totalCompletionPercentage = (() => {
		if (!collectionStats?.set_completion) return 0;
		const setCompletionData = collectionStats.set_completion as Record<string, { percentage: number }>;
		const totalPercentage = Object.values(setCompletionData).reduce((sum: number, set: { percentage: number }) => sum + set.percentage, 0);
		const setCount = Object.keys(setCompletionData).length;
		return setCount > 0 ? totalPercentage / setCount : 0;
	})();

	// Toggle profile visibility
	async function handleToggleVisibility() {
		if (!user || !profile) return;

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const newVisibility = !currentVisibility;
			const { data: updatedProfile, error } = await toggleProfileVisibility(profile.username, newVisibility);

			if (error) {
				errorMessage = `Failed to update profile visibility: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
				return;
			}

			if (updatedProfile) {
				currentVisibility = updatedProfile.is_public;
				successMessage = `Profile visibility changed to ${newVisibility ? 'public' : 'private'}.`;
			} else {
				errorMessage = 'No data returned from server after toggle.';
			}
		} catch (error) {
			errorMessage = `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}.`;
		} finally {
			isLoading = false;

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

	// Get sets sorted by completion percentage (descending)
	function getSortedSets(): [string, { count: number; total: number; percentage: number; collectedValue: number; totalValue: number }][] {
		if (!collectionStats?.set_completion) return [];

		return (Object.entries(collectionStats.set_completion) as [string, { count: number; total: number; percentage: number; collectedValue: number; totalValue: number }][])
			.sort((a, b) => b[1].percentage - a[1].percentage);
	}

	// Initialize component readiness
	// onMount(() => {
	// 	ready = true;
	// });

	$: {
		if (data) {
			const canDisplayUserNotFound = !data.targetProfile && data.pageTitle === 'User Not Found';
			// targetProfile being present implies data.targetProfile is not null/undefined
			const canDisplayPrivateProfile = data.targetProfile && !data.isPublic && !data.isOwnProfile;
			const canDisplayNotLoggedIn = !data.loggedInUsername && !data.targetProfile;
			const canDisplayProfile = !!data.targetProfile; // Main condition for displaying a profile
			const canDisplayCouldNotLoad = !data.targetProfile && data.isOwnProfile === false && data.loggedInUsername; // Check isOwnProfile specifically for this branch if needed based on template

			if (canDisplayUserNotFound || canDisplayPrivateProfile || canDisplayNotLoggedIn || canDisplayProfile || canDisplayCouldNotLoad) {
				ready = true;
			}
		}
	}
</script>

<main class="container mx-auto px-4 pb-8 text-white overflow-x-hidden">
	<div class="w-full mx-auto pb-4 lg:pb-5">
		<div in:fly|global={{ y: 50, duration: 400, delay: 200 }}>
			<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
				<PageTitle title={pageTitle} />
			</div>
			<div class="w-full max-w-[800px] mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
		</div>
	</div>

	<!-- Conditional rendering based on server data -->
	{#if ready}
		{#if !targetProfile && pageTitle === 'User Not Found'}
			<!-- User Not Found -->
			<div class="text-center p-8 flex flex-col items-center justify-center flex-grow" in:fly|global={{ y: 50, duration: 400, delay: 300 }}>
				<p class="font-bold mb-4 text-4xl text-gold-400">
					{pageTitle}
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
			<div class="text-center p-8 flex flex-col items-center justify-center flex-grow" in:fly|global={{ y: 50, duration: 400, delay: 300 }}>
				<p class="font-bold mb-4 text-3xl text-gold-400">
					{pageTitle}
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
			<div class="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl my-10 border border-gold-600/30" in:fly|global={{ y: 50, duration: 400, delay: 300 }}>
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
		{:else if targetProfile}
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

			<div in:fly|global={{ y: 50, duration: 400, delay: 350 }}>
				<!-- Profile info and controls -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
					<!-- Profile Information -->
					<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6" in:fly={{ y: 20, duration: 300, delay: 50 }}>
						<div class="flex items-center gap-4 mb-6">
							<Avatar username={targetProfile.username} size="size-16 text-3xl" profileColor={targetProfile.profile_color} />
							<div>
								<h2 class="text-xl font-semibold text-gold-400">{targetProfile.username}</h2>
								{#if isOwnProfile && user?.email}
									<p class="text-sm text-gray-400">{user.email}</p>
								{/if}
							</div>
						</div>

						{#if isOwnProfile}
							<div class="border-t border-gray-700 pt-4">
								<div class="mb-4">
									<span class="text-sm font-medium text-gray-400">Profile visibility:</span>
									<span class="ml-2 text-sm text-gold-400">
										{currentVisibility ? 'Public' : 'Private'}
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
											{currentVisibility ? 'Make my profile private' : 'Make my profile public'}
										{/if}
									</span>
								</button>
							</div>
						{/if}
					</div>

					<!-- Quick links -->
					<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 lg:col-span-2" in:fly={{ y: 20, duration: 300, delay: 100 }}>
						<h2 class="text-xl font-semibold mb-4 text-gold-400">{isOwnProfile ? 'My' : `${targetProfile.username}'s`} Collections</h2>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<a
								href={`/collection/${encodeURIComponent(targetProfile.username)}`}
								class="block p-6 bg-gray-800/60 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
							>
								<div class="flex items-center justify-between gap-3">
									<div class="flex items-center gap-3">
										<BookOpen size={20} class="text-gold-400" />
										<h3 class="text-lg font-medium text-white">
											{isOwnProfile ? 'My Collection' : `${targetProfile.username}'s Collection`}
										</h3>
									</div>
									{#if collectionStats?.total_value !== undefined}
										<span class="text-xs text-gold-200">{formatCurrency(collectionStats.total_value)}</span>
									{/if}
								</div>
								<p class="text-sm text-gray-400 mt-2">Browse all collected cards</p>
							</a>

							<a
								href={`/wishlist/${encodeURIComponent(targetProfile.username)}`}
								class="block p-6 bg-gray-800/60 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-400 hover:translate-y-[-5px]"
							>
								<div class="flex items-center justify-between gap-3">
									<div class="flex items-center gap-3">
										<ListTodo size={20} class="text-gold-400" />
										<h3 class="text-lg font-medium text-white">
											{isOwnProfile ? 'My Wishlist' : `${targetProfile.username}'s Wishlist`}
										</h3>
									</div>
									{#if collectionStats?.wishlist_count !== undefined}
										<span class="text-xs text-gold-200">{collectionStats.wishlist_count} cards</span>
									{/if}
								</div>
								<p class="text-sm text-gray-400 mt-2">View cards on the wishlist</p>
							</a>
						</div>
					</div>
				</div>

				<!-- Collection Stats Section -->
				{#if collectionStats && (isPublic || isOwnProfile)}
					<div in:fly|global={{ y: 50, duration: 400, delay: 450 }}>
						<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 mb-10" in:fly={{ y: 20, duration: 300, delay: 50 }}>
							<h2 class="text-xl font-semibold mb-6 text-gold-400">Collection Statistics</h2>

							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 mb-8">
								<div class="text-center">
									<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{collectionStats?.total_instances || 0}</span>
									<span class="text-sm text-gray-400">Total Cards</span>
								</div>
								<div class="text-center">
									<div class="flex items-center justify-center gap-1 mb-2">
										<span class="text-3xl md:text-4xl font-bold text-gold-400">{collectionStats?.unique_cards || 0}</span>
										<span class="text-sm text-gray-500">/ {allCards.length || 0}</span>
									</div>
									<span class="text-sm text-gray-400">Unique Cards</span>
								</div>
								<div class="text-center">
									<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{collectionStats?.wishlist_count || 0}</span>
									<span class="text-sm text-gray-400">Wishlist Cards</span>
								</div>
								<div class="text-center">
									<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{collectionStats?.set_completion ? Object.keys(collectionStats.set_completion).length : 0}</span>
									<span class="text-sm text-gray-400">Different Sets</span>
								</div>
								<div class="text-center">
									<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{formatCurrency(collectionStats.total_value || 0)}</span>
									<span class="text-sm text-gray-400">Collection Value</span>
								</div>
								<div class="text-center">
									<span class="block text-3xl md:text-4xl font-bold text-gold-400 mb-2">{totalCompletionPercentage.toFixed(1)}%</span>
									<span class="text-sm text-gray-400">Total Completion</span>
								</div>
							</div>

							<!-- Set Completion Progress -->
							{#if collectionStats.set_completion && Object.keys(collectionStats.set_completion).length > 0}
								<div>
									<div class="flex justify-between items-center mb-4">
										<h3 class="text-lg font-semibold text-white">Set Completion Progress <span class="text-sm font-normal text-gray-400">({Object.keys(collectionStats.set_completion).length} sets)</span></h3>
										<span class="text-sm text-gray-400 italic">Click on a set to view its cards</span>
									</div>
									<div class="max-h-[600px] overflow-y-auto pr-2">
										<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
											{#each getSortedSets() as [setName, setData], i}
												{@const set = getSetByName(setName)}
												<a
													href={isOwnProfile
														? `/collection?set=${encodeURIComponent(setName)}`
														: `/collection/${encodeURIComponent(targetProfile.username)}?set=${encodeURIComponent(setName)}`}
													class="block relative group"
													title={`View ${isOwnProfile ? 'your' : targetProfile.username + "'s"} cards from ${setName}`}
												>
													<div class="bg-gray-800/60 rounded-lg p-4 border border-transparent hover:border-gold-400 hover:bg-gray-700/40 transition-all duration-300 cursor-pointer" in:fly={{ y: 20, duration: 300, delay: 50 + (i * 30) }}>
														<div class="flex justify-between items-center mb-2">
															<div class="flex items-center gap-2">
																{#if !NO_IMAGES && set?.logo}
																	<img src={set.logo} alt={setName} class="h-6 w-auto" />
																{/if}
																<h4 class="font-medium text-white group-hover:text-gold-400 transition-colors duration-200">{setName}</h4>
															</div>
															<div class="flex items-center gap-2">
																<span class="text-sm text-gold-400">{setData.percentage.toFixed(1)}%</span>
																<ChevronRight size={16} class="text-gray-500 group-hover:text-gold-400 transition-colors duration-200" />
															</div>
														</div>
														<div class="w-full bg-gray-700 rounded-full h-2.5 mb-4">
															<div class="bg-gold-400 h-2.5 rounded-full" style="width: {setData.percentage}%"></div>
														</div>
														<div class="flex justify-between text-xs text-gray-400">
															<span>{setData.count} / {setData.total} cards</span>
															<span>Value: {formatCurrency(setData.collectedValue)}</span>
														</div>
													</div>
												</a>
											{/each}
										</div>
									</div>
								</div>
							{:else}
								<p class="text-gray-400">No set completion data available.</p>
							{/if}
						</div>
					</div>
				{:else if !targetProfile && !isOwnProfile && loggedInUsername}
					<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 text-center" in:fly|global={{ y: 50, duration: 400, delay: 300 }}>
						<p class="text-gray-400">Could not load the requested profile.</p>
						<a href="/" class="text-gold-400 hover:underline mt-2 inline-block">Return Home</a>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Skeleton Loader -->
			<div class="animate-pulse">
				<!-- Profile Info Skeleton -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
					<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6">
						<div class="flex items-center gap-4 mb-6">
							<div class="bg-gray-700 rounded-full size-16"></div>
							<div>
								<div class="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
								<div class="h-4 bg-gray-700 rounded w-1/2"></div>
							</div>
						</div>
						<div class="border-t border-gray-700 pt-4">
							<div class="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
							<div class="h-8 bg-gray-700 rounded w-1/2"></div>
						</div>
					</div>
					<!-- Statistics Skeleton -->
					<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 lg:col-span-2">
						<div class="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							{#each Array(4) as _}
								<div>
									<div class="h-4 bg-gray-700 rounded w-1/2 mb-1"></div>
									<div class="h-5 bg-gray-700 rounded w-3/4"></div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Set Completion Skeleton -->
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 mb-10">
					<div class="h-6 bg-gray-700 rounded w-1/3 mb-6"></div>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each Array(3) as _}
							<div class="p-4 rounded-lg bg-gray-700/30 border border-gold-600/20">
								<div class="flex items-center mb-3">
									<div class="bg-gray-600 w-10 h-10 mr-3 rounded"></div>
									<div>
										<div class="h-5 bg-gray-600 rounded w-3/4 mb-1"></div>
										<div class="h-3 bg-gray-600 rounded w-1/2"></div>
									</div>
								</div>
								<div class="mb-1">
									<div class="flex justify-between text-xs mb-0.5">
										<div class="h-3 bg-gray-600 rounded w-1/4"></div>
										<div class="h-3 bg-gray-600 rounded w-1/4"></div>
									</div>
									<div class="w-full bg-gray-600 rounded-full h-2.5">
										<div class="bg-gray-500 h-2.5 rounded-full" style="width: 60%"></div>
									</div>
								</div>
								<div class="text-xs mt-2 space-y-1">
									<div class="h-3 bg-gray-600 rounded w-full"></div>
									<div class="h-3 bg-gray-600 rounded w-5/6"></div>
									<div class="h-3 bg-gray-600 rounded w-4/6"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
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
