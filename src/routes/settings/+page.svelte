<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Avatar from '$lib/components/auth/Avatar.svelte';
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
		<PageTitle title="Settings" />
	</div>
</div>

<div class="container mx-auto px-4 py-8">
	{#if !$authStore.user || !$authStore.profile}
		<div class="text-center p-8">
			<p class="text-lg">Please sign in to view settings.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Settings Navigation -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div class="flex items-center gap-4 mb-6">
					<Avatar username={$authStore.profile.username} size="size-12 text-xl" />
					<div>
						<h2 class="text-xl font-semibold dark:text-white">{$authStore.profile.username}</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">{$authStore.user.email}</p>
					</div>
				</div>

				<div class="border-t dark:border-gray-700 pt-4">
					<nav class="flex flex-col space-y-1">
						<a href="#account" class="py-2 px-3 rounded-md bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white">
							Account Settings
						</a>
						<a href="#privacy" class="py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
							Privacy
						</a>
					</nav>
				</div>
			</div>

			<!-- Settings Content -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
				<div id="account" class="mb-8">
					<h2 class="text-xl font-semibold mb-4 dark:text-white">Account Settings</h2>

					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="email">
								Email
							</label>
							<input
								id="email"
								type="email"
								value={$authStore.user.email}
								disabled
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
							/>
							<p class="mt-1 text-xs text-gray-500">To change your email, please contact support.</p>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="username">
								Username
							</label>
							<input
								id="username"
								type="text"
								value={$authStore.profile.username}
								disabled
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
							/>
							<p class="mt-1 text-xs text-gray-500">Username cannot be changed.</p>
						</div>
					</div>
				</div>

				<div id="privacy" class="mb-8">
					<h2 class="text-xl font-semibold mb-4 dark:text-white">Privacy</h2>

					<div class="space-y-4">
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Your data is stored securely. You can visit your profile page to toggle your profile visibility.
						</p>

						<a
							href="/profile"
							class="inline-block py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
						>
							Manage Profile Visibility
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
