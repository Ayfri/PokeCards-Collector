<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import type { UserProfile } from '$lib/types';
	import Avatar from '$lib/components/auth/Avatar.svelte';
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

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
				// Mettre à jour manuellement le profil dans le store (correction de l'erreur TypeScript)
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

	// Check if user is logged in
	onMount(() => {
		const unsubscribe = authStore.subscribe(state => {
			if (state.user === null && !state.loading) {
				// Redirect to home if not logged in
				goto('/');
			}
		});

		return unsubscribe;
	});
</script>

<div class="w-full mx-auto pb-4 lg:pb-5">
	<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
		<PageTitle title="My Profile" />
	</div>
</div>

<div class="container mx-auto px-4 py-8">
	{#if !$authStore.user || !$authStore.profile}
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
		{#if errorMessage}
			<div class="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
				<p>{errorMessage}</p>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Profile Information -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-center gap-4 mb-6">
					<Avatar username={$authStore.profile.username} size={16} />
					<div>
						<h2 class="text-xl font-semibold dark:text-white">{$authStore.profile.username}</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$authStore.user.email}</p>
					</div>
				</div>

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
			</div>

			<!-- Quick links -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
				<h2 class="text-xl font-semibold mb-4 dark:text-white">My Collections</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<a
						href={`/collection?user=${encodeURIComponent($authStore.profile.username)}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">My Collection</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Manage your collected cards</p>
					</a>

					<a
						href={`/wishlist?user=${encodeURIComponent($authStore.profile.username)}`}
						class="block p-6 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
					>
						<h3 class="text-lg font-medium mb-2 dark:text-white">My Wishlist</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">Cards you want to acquire</p>
					</a>
				</div>
			</div>
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
