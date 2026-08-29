<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import BouncyLoader from '../BouncyLoader.svelte';
	import { readJson, type ApiError } from '$helpers/http';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	interface Props {
		onSuccess?: (() => void) | undefined;
		onSwitch?: ((tab: 'login' | 'register') => void) | undefined;
	}

	let { onSuccess = undefined, onSwitch = undefined }: Props = $props();

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	const passwordCriteria = $derived({
		digit: /[0-9]/.test(password),
		length: password.length >= 8,
		special: /[^a-zA-Z0-9]/.test(password)
	});
	const passwordStrength = $derived(Object.values(passwordCriteria).filter(Boolean).length);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	async function validateUsername() {
		try {
			if (!username) {
				return true;
			}
			
			if (username.length < 3) {
				errorMessage = 'Username must contain at least 3 characters';
				return false;
			}
			
			if (!/^[a-zA-Z0-9_]+$/.test(username)) {
				errorMessage = 'Username can only contain letters, numbers and underscores';
				return false;
			}
			
			if (username.length > 20) {
				errorMessage = 'Username cannot exceed 20 characters';
				return false;
			}
			
			try {
				const response = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`);
				
				const data = await readJson<{ success?: boolean; exists?: boolean }>(response, {});
				
				if (!data.success) {
					errorMessage = 'Error checking username availability';
					return false;
				}
				
				if (data.exists) {
					errorMessage = 'This username is already taken';
					return false;
				}
				
				return true;
			} catch (checkError) {
				console.error('Error checking username:', checkError);
				errorMessage = 'Error checking username availability';
				return false;
			}
		} catch (error) {
			errorMessage = 'Internal error during username validation';
			return false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		try {
			// Basic validation
			if (!email || !username || !password || !confirmPassword) {
				errorMessage = 'Please fill in all fields';
				return;
			}

			if (password !== confirmPassword) {
				errorMessage = 'Passwords do not match';
				return;
			}

			if (password.length < 8 || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
				errorMessage = 'Password must be at least 8 characters long and include at least one number and one special character';
				return;
			}
			
			// Username validation
			const isUsernameValid = await validateUsername();
			
			if (!isUsernameValid) {
				return;
			}
			
			// Everything is validated, continue
			loading = true;
			errorMessage = '';
			
			const registerTimeout = setTimeout(() => {
				if (loading) {
					errorMessage = 'Registration is taking longer than expected. Please check your internet connection or try again later.';
					loading = false;
				}
			}, 15000);

			try {
				if (!navigator.onLine) {
					clearTimeout(registerTimeout);
					errorMessage = 'No internet connection. Please check your network.';
					loading = false;
					return;
				}
				
				// 1. Attempt Signup via API
				const signupResponse = await fetch('/api/auth/signup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, username }),
				});

				if (!signupResponse.ok) {
					clearTimeout(registerTimeout);
					const errorData = await readJson<ApiError>(signupResponse, {});
					let signupErrorMsg = errorData.message || errorData.error || 'Error during registration';
					if (signupErrorMsg.includes('already registered')) {
						signupErrorMsg = 'This email is already registered';
					} else if (signupErrorMsg.includes('already taken')) {
						signupErrorMsg = 'This username is already taken';
					}
					errorMessage = signupErrorMsg;
					loading = false;
					return;
				}

				const loginResponse = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password }),
				});

				clearTimeout(registerTimeout);

				if (!loginResponse.ok) {
					console.error('Automatic sign in failed after signup:', loginResponse.status);
					const errorData = await readJson<ApiError>(loginResponse, {});
					errorMessage = `Registration successful, but automatic login failed. ${errorData.message || 'Please log in manually.'}`;
					loading = false;
					onSwitch?.('login');
					return;
				}

				loading = false;

				onSuccess?.();

				await invalidateAll();
				const currentPath = $page.url.pathname;
				if (currentPath.includes('/login') || currentPath.includes('/auth') || currentPath.includes('/register') || currentPath.includes('/reset-password')) {
					goto('/');
				} else {
					goto(currentPath + $page.url.search);
				}

			} catch (fetchError) {
				clearTimeout(registerTimeout);
				console.error('Network or fetch error during signup/login process:', fetchError);
				errorMessage = 'An error occurred while communicating with the server. Please try again.';
				loading = false;
			}
		} catch (error: unknown) {
			console.error('Unexpected error during form submission:', error);
			loading = false; // Ensure loading is stopped
			// Use a generic error message for unexpected errors
			errorMessage = `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
			// alert is generally discouraged, using the errorMessage div is better UX
			// alert(`Error during submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	const togglePasswordVisibility = () => {
		showPassword = !showPassword;
	};

	const toggleConfirmPasswordVisibility = () => {
		showConfirmPassword = !showConfirmPassword;
	};

</script>

<form onsubmit={handleSubmit} class="space-y-4">
	{#if errorMessage}
		<div class="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
			{errorMessage}
		</div>
	{/if}
	
	<div>
		<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Email
		</label>
		<input
			type="email"
			id="email"
			bind:value={email}
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
			placeholder="your@email.com"
			required
		/>
	</div>
	
	<div>
		<label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Username
		</label>
		<input
			type="text"
			id="username"
			bind:value={username}
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
			placeholder="username"
			required
			maxlength="20"
		/>
	</div>
	
	<div>
		<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Password
		</label>
		<div class="relative">
			{#if showPassword}
				<input
					bind:value={password}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="password"
					name="password"
					placeholder="Choose a strong password"
					required
					type="text"
				/>
			{:else}
				<input
					bind:value={password}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="password"
					name="password"
					placeholder="Choose a strong password"
					required
					type="password"
				/>
			{/if}
			<button
				class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-700 dark:text-gray-300"
				onclick={togglePasswordVisibility}
				type="button"
				title={showPassword ? "Hide password" : "Show password"}
			>
				<span class="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
				{#if showPassword}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
			</button>
		</div>
		<!-- Password strength bar -->
		<div class="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-sm">
			<div class="h-2 rounded-sm transition-all duration-300 {passwordStrength === 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-yellow-400' : passwordStrength === 3 ? 'bg-green-500' : 'bg-gray-200'}"
				style="width: {passwordStrength * 33.33}%;">
			</div>
		</div>
		<ul class="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
			<li class={passwordCriteria.length ? 'text-green-600 dark:text-green-400' : ''}>• At least 8 characters</li>
			<li class={passwordCriteria.digit ? 'text-green-600 dark:text-green-400' : ''}>• At least one number</li>
			<li class={passwordCriteria.special ? 'text-green-600 dark:text-green-400' : ''}>• At least one special character</li>
		</ul>
	</div>
	
	<div>
		<label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Confirm Password
		</label>
		<div class="relative">
			{#if showConfirmPassword}
				<input
					bind:value={confirmPassword}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="confirm-password"
					name="confirm-password"
					placeholder="••••••••"
					required
					type="text"
				/>
			{:else}
				<input
					bind:value={confirmPassword}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="confirm-password"
					name="confirm-password"
					placeholder="••••••••"
					required
					type="password"
				/>
			{/if}
			<button
				class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-700 dark:text-gray-300"
				onclick={toggleConfirmPasswordVisibility}
				type="button"
				title={showConfirmPassword ? "Hide password" : "Show password"}
			>
				<span class="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
				{#if showConfirmPassword}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
			</button>
		</div>
	</div>
	
	<button
		type="submit"
		disabled={loading}
		class="w-full py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
	>
		{#if loading}
			<BouncyLoader size={20} gradientColorStart="#FFFFFF" gradientColorEnd="#FFFFFF" />
			<span class="ml-2">Registering...</span>
		{:else}
			Register
		{/if}
	</button>
</form>

<style>
	/* @keyframes spin Removed as it's no longer used */

	/* .loader-spin Removed as it's no longer used */
</style> 