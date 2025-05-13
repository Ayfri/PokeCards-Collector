<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Avatar from '$lib/components/auth/Avatar.svelte';
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	// @ts-expect-error: No types for svelte-color-picker
	import {HsvPicker} from 'svelte-color-picker';

	let ready = false;
	// Default gold color from Avatar.svelte, in case profile.profile_color is not set
	const defaultProfileHexColor = '#fbc54a';
	let profileColorInput: string = defaultProfileHexColor;
	let showColorPicker = false;
	let colorPickerRef: HTMLDivElement | null = null;

	$: user = page.data.user;
	$: profile = page.data.profile;

	// Simpler reactive update for profileColorInput:
	// It directly reflects profile.profile_color or defaults.
	$: profileColorInput = (profile && profile.profile_color && typeof profile.profile_color === 'string' && profile.profile_color.startsWith('#'))
							? profile.profile_color
							: defaultProfileHexColor;

	onMount(() => {
		// Initialize from page.data on mount, which might have been set by server load.
		if (page.data.profile) {
			profileColorInput = (page.data.profile.profile_color && typeof page.data.profile.profile_color === 'string' && page.data.profile.profile_color.startsWith('#'))
								? page.data.profile.profile_color
								: defaultProfileHexColor;
		} else {
			// If no profile on mount, ensure default is set (though already done at declaration)
			profileColorInput = defaultProfileHexColor;
		}

		if (browser && !page.data.user) {
			goto('/');
		}
		ready = true;
	});

	function rgbToHex(r: number, g: number, b: number): string {
		const toHex = (v: number) => v.toString(16).padStart(2, '0');
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	function colorCallback(e: any) {
		const { r, g, b } = e.detail;
		const hex = rgbToHex(r, g, b);
		profileColorInput = hex;
	}

	function openColorPicker() {
		showColorPicker = true;
	}
	function closeColorPicker() {
		showColorPicker = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (colorPickerRef && !colorPickerRef.contains(event.target as Node)) {
			closeColorPicker();
		}
	}

	$: if (showColorPicker) {
		window.addEventListener('mousedown', handleClickOutside);
	} else {
		window.removeEventListener('mousedown', handleClickOutside);
	}
</script>

<main class="container mx-auto px-4 pb-8 text-white overflow-x-hidden">
	<div class="w-full mx-auto pb-4 lg:pb-5">
		<div class="flex justify-between mx-28 max-lg:mx-4 items-center">
			<PageTitle title="Settings" />
		</div>
		<div class="w-full max-w-[800px] mx-auto my-2 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
	</div>

	{#if ready}
		<!-- Use reactive user/profile variables -->
		{#if !user || !profile}
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
						<!-- Use reactive profile variable and pass profile_color -->
						<Avatar username={profile?.username || 'U'} size="size-12 text-xl" profileColor={profileColorInput} />
						<div>
							<!-- Use reactive profile variable -->
							<h2 class="text-xl font-semibold text-gold-400">{profile?.username}</h2>
							<!-- Use reactive user variable -->
							<p class="text-sm text-gray-400">{user?.email}</p>
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

						<form
							method="POST"
							action="?/updateProfile"
							use:enhance={() => {
								return async ({ result }) => {
									// After the form submission, if it's successful, reload the page.
									if (result.type === 'success' && result.data?.success) {
										window.location.reload();
									}
								};
							}}
							class="space-y-4"
						>
							<div>
								<label class="block text-sm font-medium text-gray-300 mb-1" for="email">
									Email
								</label>
								<input
									id="email"
									type="email"
									value={user?.email || ''}
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
									value={profile?.username || ''}
									disabled
									class="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800/60 text-gray-400"
								/>
								<p class="mt-1 text-xs text-gray-500">Username cannot be changed.</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-300 mb-1" for="profileColor">
									Profile Color (Hex)
								</label>
								<div class="flex items-center gap-3">
									<!-- Swatch bouton -->
									<button type="button"
										class="w-10 h-10 rounded-full border flex-shrink-0 focus:outline-none"
										style={`background: ${profileColorInput}`}
										on:click={openColorPicker}
										title="Change color"
									></button>
									<!-- Popover color picker -->
									{#if showColorPicker}
										<div bind:this={colorPickerRef} class="absolute z-50 mt-2 bg-gray-900 p-4 rounded-lg shadow-lg border border-gold-400">
											<div class="flex justify-end mb-2">
												<button type="button" class="text-gray-400 hover:text-gold-400 text-xl font-bold" on:click={closeColorPicker}>&times;</button>
											</div>
											<HsvPicker on:colorChange={colorCallback} startColor={profileColorInput} />
										</div>
									{/if}
									<!-- Champ caché pour le submit -->
									<input type="hidden" name="profile_color" bind:value={profileColorInput} />
									<input
										id="profileColorText"
										aria-label="Profile color hex value"
										type="text"
										bind:value={profileColorInput}
										placeholder="#RRGGBB"
										pattern={"^#[0-9A-Fa-f]{6}$"}
										class="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800/60 text-gray-300 focus:border-gold-400 focus:ring-gold-400"
									/>
								</div>
								<p class="mt-1 text-xs text-gray-500">Choose your profile color or enter a hex value (e.g., #FF0000).</p>
							</div>

							<button
								type="submit"
								class="animated-hover-button relative overflow-hidden inline-flex items-center justify-center py-2 px-4 border-2 border-gold-400 rounded-md text-sm font-medium text-gold-400 bg-transparent transition-all duration-300 hover:text-black mt-2"
							>
								<span class="relative z-10">Save Profile Settings</span>
							</button>
						</form>
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
		<!-- Loading state (can be empty if relying on top loading bar) -->
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
