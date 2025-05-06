<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import SearchIcon from 'lucide-svelte/icons/search';
	import UserIcon from 'lucide-svelte/icons/user';
	import UserXIcon from 'lucide-svelte/icons/user-x';
	import { page } from '$app/state';

	let searchQuery = '';
	let searchResults: Array<{
		auth_id: string;
		username: string;
		avatar_url: string | null;
		is_public: boolean;
	}> = [];
	let isLoading = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let isInitialState = true;
	let errorMessage = '';

	// Update URL params when the search query changes
	function updateUrlWithoutNavigating(query: string) {
		const url = new URL(window.location.href);
		if (query) {
			url.searchParams.set('q', query);
		} else {
			url.searchParams.delete('q');
		}
		history.replaceState({}, '', url.toString());
	}

	// Debounced search function
	async function searchUsers() {
		isLoading = true;
		isInitialState = false;
		errorMessage = '';

		try {
			if (!searchQuery.trim()) {
				searchResults = [];
				updateUrlWithoutNavigating('');
				isLoading = false;
				return;
			}

			const response = await fetch(`/api/search-users?q=${encodeURIComponent(searchQuery)}&limit=10`);
			const data = await response.json();

			if (data.success) {
				searchResults = data.users;
				updateUrlWithoutNavigating(searchQuery);
			} else {
				console.error('Error searching users:', data.error);
				errorMessage = 'Failed to search users. Please try again later.';
				searchResults = [];
			}
		} catch (error) {
			console.error('Failed to search users:', error);
			errorMessage = 'An unexpected error occurred. Please try again later.';
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	// Handle input changes with debounce
	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchUsers();
		}, 300); // 300ms debounce
	}

	// Navigate to user profile
	function viewProfile(username: string) {
		goto(`/profile?user=${encodeURIComponent(username)}`);
	}

	// Initialize from URL parameters
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const queryParam = urlParams.get('q');
		
		if (queryParam) {
			searchQuery = queryParam;
			searchUsers();
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-2xl md:text-3xl font-bold mb-6 text-gold-400">Find Users</h1>

	<div class="mb-8 max-w-2xl">
		<div class="relative">
			<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
				<SearchIcon size={20} />
			</div>
			<input
				type="text"
				class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400 text-white"
				placeholder="Search users by username..."
				bind:value={searchQuery}
				on:input={handleSearchInput}
				aria-label="Search users"
			/>
		</div>
	</div>

	{#if isLoading}
		<div class="flex justify-center my-8">
			<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-400"></div>
		</div>
	{:else if errorMessage}
		<div class="text-center my-12 py-8 bg-gray-800 rounded-lg border border-red-600">
			<div class="text-red-400 mb-2">⚠️ Error</div>
			<p class="text-white mb-4">{errorMessage}</p>
			<button 
				class="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-400 transition-colors"
				on:click={searchUsers}
			>
				Try Again
			</button>
		</div>
	{:else if !isInitialState}
		{#if searchResults.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each searchResults as user}
					<div
						class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gold-400 transition-colors cursor-pointer"
						on:click={() => viewProfile(user.username)}
						on:keydown={(e) => e.key === 'Enter' && viewProfile(user.username)}
						tabindex="0"
						role="button"
					>
						<div class="p-4 flex items-center gap-3">
							<div class="flex-shrink-0">
								{#if user.avatar_url}
									<img 
										src={user.avatar_url} 
										alt={user.username}
										class="w-12 h-12 rounded-full object-cover"
									/>
								{:else}
									<div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
										<UserIcon size={24} class="text-gray-400" />
									</div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-medium text-white truncate">{user.username}</h3>
								<div class="flex items-center mt-1">
									{#if user.is_public}
										<span class="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Public</span>
									{:else}
										<span class="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Private</span>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if searchQuery.trim() !== ''}
			<div class="text-center my-12 py-8 bg-gray-800 rounded-lg border border-gray-700">
				<UserXIcon size={48} class="mx-auto mb-4 text-gray-400" />
				<h3 class="text-xl font-medium text-white mb-2">No users found</h3>
				<p class="text-gray-400">Try a different search term</p>
			</div>
		{/if}
	{/if}
</div> 