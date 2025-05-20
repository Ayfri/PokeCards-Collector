<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Avatar from '@components/auth/Avatar.svelte';
	import AlertTriangleIcon from 'lucide-svelte/icons/alert-triangle';
	import CrownIcon from 'lucide-svelte/icons/crown';
	import SearchIcon from 'lucide-svelte/icons/search';
	import TrendingUpIcon from 'lucide-svelte/icons/trending-up';
	import UserXIcon from 'lucide-svelte/icons/user-x';
	import InfoIcon from 'lucide-svelte/icons/info';
	import type { PageData } from './$types';
	import PageTitle from '@components/PageTitle.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import UserCard from '@components/users/UserCard.svelte';

	export let data: PageData;

	$: featuredUsers = data.featuredUsers || [];
	$: featuredUsersError = data.featuredUsersError;

	interface SearchResultUser {
		auth_id: string;
		username: string;
		is_public: boolean; // Will be true based on new query, but kept for structure
		profile_color: string | null;
		created_at: string;
		unique_card_count: number;
	}

	let searchQuery = '';
	let searchResults: SearchResultUser[] = [];
	let isLoadingSearch = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let isInitialSearchState = true;
	let searchErrorMessage = '';

	function updateUrlWithoutNavigating(query: string) {
		const url = new URL(window.location.href);
		if (query) {
			url.searchParams.set('q', query);
		} else {
			url.searchParams.delete('q');
		}
		history.replaceState({}, '', url.toString());
	}

	async function performSearchUsers() {
		isLoadingSearch = true;
		isInitialSearchState = false;
		searchErrorMessage = '';

		try {
			if (!searchQuery.trim()) {
				searchResults = [];
				updateUrlWithoutNavigating('');
				isLoadingSearch = false;
				return;
			}

			const response = await fetch(`/api/search-users?q=${encodeURIComponent(searchQuery)}&limit=12`);
			const responseData = await response.json();

			if (responseData.success) {
				console.log('responseData.users', responseData.users);
				searchResults = responseData.users;
				updateUrlWithoutNavigating(searchQuery);
			} else {
				console.error('Error searching users:', responseData.error);
				searchErrorMessage = 'Failed to search users. Please try again later.';
				searchResults = [];
			}
		} catch (error) {
			console.error('Failed to search users:', error);
			searchErrorMessage = 'An unexpected error occurred. Please try again later.';
			searchResults = [];
		} finally {
			isLoadingSearch = false;
		}
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			performSearchUsers();
		}, 300);
	}

	function viewProfile(username: string) {
		goto(`/profile/${encodeURIComponent(username)}`);
	}

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const queryParam = urlParams.get('q');

		if (queryParam) {
			searchQuery = queryParam;
			performSearchUsers();
		}
	});
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-6 md:space-y-10 text-white">
	<div class="flex flex-col items-center text-center space-y-2">
		<PageTitle title="Users & Collectors" />
		<p class="text-sm md:text-base text-gray-400 max-w-2xl mx-auto text-balance">
			Discover fellow Pokémon TCG enthusiasts! See who's leading the pack, or search for specific users to view their public profiles and stats.
		</p>
	</div>

	<!-- Search Users Section (Sticky) -->
	<section aria-labelledby="search-users-title" class="sticky top-0 z-50 py-4 backdrop-blur-md -mx-4 px-4 shadow-lg rounded-b-xl mb-6">
		<h2 id="search-users-title" class="text-xl md:text-2xl font-semibold text-white flex items-center gap-2 mb-3 sr-only">
			<SearchIcon class="text-blue-400" size={28} />
			Find a Specific User
		</h2>
		<div class="max-w-xl mx-auto">
			<div class="relative">
				<div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
					<SearchIcon size={20} />
				</div>
				<TextInput
					id="user-search"
					label="Search users by username"
					labelClass="sr-only"
					placeholder="Search public users by username..."
					bind:value={searchQuery}
					debounceFunction={handleSearchInput}
					class="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none text-white shadow-sm placeholder-gray-500 !h-auto"
					aria-label="Search users by username"
				/>
			</div>
		</div>
	</section>

	{#if isLoadingSearch}
		<div class="flex justify-center pt-6">
			<div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>
		</div>
	{:else if searchErrorMessage}
		<div class="text-center py-6 bg-gray-800/70 backdrop-blur-sm rounded-lg border border-red-600 max-w-md mx-auto shadow-xl">
			<AlertTriangleIcon size={36} class="mx-auto mb-2 text-red-400" />
			<h3 class="text-lg font-medium text-white mb-1">Search Error</h3>
			<p class="text-gray-300 mb-3 text-sm px-4">{searchErrorMessage}</p>
			<button
				class="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
				on:click={performSearchUsers}
			>
				Try Again
			</button>
		</div>
	{:else if !isInitialSearchState}
		{#if searchResults.length > 0}
			<div class="space-y-4">
				<h3 class="text-xl font-semibold text-white mb-3">Search Results ({searchResults.length})</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
					{#each searchResults as user (user.auth_id)}
						<UserCard {user} />
					{/each}
				</div>
			</div>
		{:else if searchQuery.trim() !== ''}
			<div class="text-center py-8 bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700 max-w-md mx-auto shadow-lg">
				<UserXIcon size={40} class="mx-auto mb-3 text-gray-400" />
				<h3 class="text-xl font-medium text-white mb-1">No Users Found</h3>
				<p class="text-gray-400 px-4">No public users match <strong class="text-gold-400">"{searchQuery}"</strong>. Try a different search term.</p>
			</div>
		{/if}
	{:else if featuredUsers.length > 0 || featuredUsersError}
	    <!-- Separator, only show if there are featured users or an error for them, and no search is active -->
	    <div class="w-full max-w-[700px] mx-auto h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent my-6"></div>
	{/if}


	<!-- Featured Users Section -->
	<section aria-labelledby="featured-users-title" class="space-y-4">
		<h2 id="featured-users-title" class="text-2xl md:text-3xl font-semibold text-gold-400 flex items-center gap-3">
			<CrownIcon size={28} />
			Featured Collectors
		</h2>
		{#if featuredUsersError}
			<div class="text-center my-6 p-5 bg-gray-800/70 backdrop-blur-sm rounded-lg border border-red-600 shadow-xl">
				<AlertTriangleIcon size={40} class="mx-auto mb-3 text-red-400" />
				<h3 class="text-xl font-medium text-white mb-1">Error Loading Featured Collectors</h3>
				<p class="text-gray-300">{featuredUsersError}</p>
			</div>
		{:else if featuredUsers.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
				{#each featuredUsers as user (user.auth_id)}
					<UserCard
						{user}
						highlightClass="text-gold-400 group-hover:text-gold-300"
						hoverBorderClass="hover:border-gold-400/70"
						hoverShadowClass="hover:shadow-gold-500/30"
						countTextSuffix="unique card"
					/>
				{/each}
			</div>
		{:else}
			<div class="text-center my-6 p-5 bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700 shadow-lg">
				<TrendingUpIcon size={40} class="mx-auto mb-3 text-gray-400" />
				<h3 class="text-xl font-medium text-white mb-1">No Featured Collectors Yet</h3>
				<p class="text-gray-400 mb-2">Check back later to see top collectors!</p>
				<p class="text-sm text-gray-500">To appear here, make your profile public and add cards to your collection.</p>
			</div>
		{/if}
	</section>

	<div class="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex items-center justify-center gap-2 text-sm text-gray-400">
		<InfoIcon size={16} class="flex-shrink-0" />
		<span>Want to be featured? Make your profile public and grow your collection!</span>
	</div>
</div>
