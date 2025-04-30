<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Avatar from '$lib/components/auth/Avatar.svelte';
	import { fly, fade } from 'svelte/transition';
	
	let ready = false;
	
	// Check if user is logged in
	onMount(() => {
		const unsubscribe = authStore.subscribe(state => {
			if (state.user === null && !state.loading) {
				// Redirect to home if not logged in
				goto('/');
			}
		});
		
		ready = true;
		return unsubscribe;
	});
</script>

<main class="container mx-auto px-4 pb-8 text-white overflow-x-hidden">
	<div class="w-full mx-auto pb-4 lg:pb-5">
		<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
			<PageTitle title="Settings" />
		</div>
		<div class="w-full max-w-[800px] mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
	</div>

	{#if ready}
		{#if !$authStore.user || !$authStore.profile}
			<div class="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl my-10" in:fade={{ duration: 700 }}>
				<p class="text-xl text-gold-400 font-bold mb-4">Please sign in to view settings.</p>
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
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8" in:fly={{ y: 20, duration: 500, delay: 100 }} out:fade={{ duration: 200 }}>
				<!-- Settings Navigation -->
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6">
					<div class="flex items-center gap-4 mb-6">
						<Avatar username={$authStore.profile.username} size="size-12 text-xl" />
						<div>
							<h2 class="text-xl font-semibold text-gold-400">{$authStore.profile.username}</h2>
							<p class="text-sm text-gray-400">{$authStore.user.email}</p>
						</div>
					</div>

					<div class="border-t border-gray-700 pt-4">
						<nav class="flex flex-col space-y-1">
							<a href="#account" class="py-2 px-3 rounded-md bg-gray-800/80 font-medium text-gold-400 border border-transparent hover:border-gold-400 transition-all duration-300">
								Account Settings
							</a>
							<a href="#privacy" class="py-2 px-3 rounded-md hover:bg-gray-800/80 text-gray-300 border border-transparent hover:border-gold-400 transition-all duration-300">
								Privacy
							</a>
						</nav>
					</div>
				</div>

				<!-- Settings Content -->
				<div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 lg:col-span-2">
					<div id="account" class="mb-8">
						<h2 class="text-xl font-semibold mb-4 text-gold-400">Account Settings</h2>

						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-300 mb-1" for="email">
									Email
								</label>
								<input
									id="email"
									type="email"
									value={$authStore.user.email}
									disabled
									class="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800/60 text-gray-400"
								/>
								<p class="mt-1 text-xs text-gray-500">To change your email, please contact support.</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-300 mb-1" for="username">
									Username
								</label>
								<input
									id="username"
									type="text"
									value={$authStore.profile.username}
									disabled
									class="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800/60 text-gray-400"
								/>
								<p class="mt-1 text-xs text-gray-500">Username cannot be changed.</p>
							</div>
						</div>
					</div>

					<div id="privacy" class="mb-8">
						<h2 class="text-xl font-semibold mb-4 text-gold-400">Privacy</h2>

						<div class="space-y-4">
							<p class="text-sm text-gray-300">
								Your data is stored securely. You can visit your profile page to toggle your profile visibility.
							</p>
							
							<a
								href="/profile"
								class="animated-hover-button relative overflow-hidden inline-block py-2 px-4 border-2 border-gold-400 rounded-md text-sm font-medium text-gold-400 bg-transparent transition-all duration-300 hover:text-black mt-2"
							>
								<span class="relative z-10">Go to Profile Settings</span>
							</a>
						</div>
					</div>
				</div>
			</div>
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

	.animated-hover-button::before {
		background-color: #fbc54a;
		bottom: 0;
		content: '';
		height: 0;
		left: 0;
		position: absolute;
		transition: height 0.3s ease-in-out;
		width: 100%;
		z-index: 0;
	}

	.animated-hover-button:hover::before {
		height: 100%;
	}
</style>
