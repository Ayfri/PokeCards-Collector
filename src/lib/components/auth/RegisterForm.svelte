<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let onSuccess: (() => void) | undefined = undefined;
	export let onSwitch: ((tab: 'login' | 'register') => void) | undefined = undefined;

	let email = '';
	let username = '';
	let password = '';
	let confirmPassword = '';
	let loading = false;
	let errorMessage = '';
	let passwordStrength = 0;
	let passwordCriteria = {
		length: false,
		digit: false,
		special: false
	};

	onMount(() => {
		// Composant monté
	});

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
			
			// Utiliser directement fetch pour vérifier le nom d'utilisateur
			try {
				const response = await fetch('/api/auth/test', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						action: 'check_username',
						username
					})
				});
				
				const data = await response.json();
				
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

	async function handleSubmit() {
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
					let signupErrorMsg = 'Error during registration';
					try {
						const errorData = await signupResponse.json();
						signupErrorMsg = errorData.message || errorData.error || signupErrorMsg;
						if (signupErrorMsg.includes('already registered')) {
							signupErrorMsg = 'This email is already registered';
						} else if (signupErrorMsg.includes('already taken')) {
							signupErrorMsg = 'This username is already taken';
						}
					} catch (e) { /* Ignore parsing error, use default */ }
					errorMessage = signupErrorMsg;
					loading = false;
					return;
				}

				// Signup successful, now attempt automatic login via API
				console.log('Signup successful, attempting automatic sign in via API...');
				const loginResponse = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password }),
				});

				clearTimeout(registerTimeout);

				if (!loginResponse.ok) {
					console.error('Automatic sign in failed after signup:', loginResponse.status);
					let loginErrorMsg = 'Registration successful, but automatic login failed.';
					try {
						const errorData = await loginResponse.json();
						loginErrorMsg += ` ${errorData.message || 'Please log in manually.'}`;
					} catch(e) { loginErrorMsg += ' Please log in manually.'; }
					errorMessage = loginErrorMsg;
					loading = false;
					onSwitch?.('login'); // Switch to login tab
					return;
				}

				// Automatic login successful via API (cookies are set)
				console.log('Automatic sign in successful via API!');
				loading = false;

				// Dispatch success event
				onSuccess?.();

				// Navigate to home - SSR should pick up the new session from cookies
				window.location.href = '/'; // Force full reload for session

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

	$: {
		passwordCriteria.length = password.length >= 8;
		passwordCriteria.digit = /[0-9]/.test(password);
		passwordCriteria.special = /[^a-zA-Z0-9]/.test(password);
		passwordStrength = [passwordCriteria.length, passwordCriteria.digit, passwordCriteria.special].filter(Boolean).length;
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
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
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
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
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
			placeholder="username"
			required
			maxlength="20"
		/>
	</div>
	
	<div>
		<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Password
		</label>
		<input
			type="password"
			id="password"
			bind:value={password}
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
			placeholder="••••••••"
			required
		/>
		<!-- Password strength bar -->
		<div class="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded">
			<div class="h-2 rounded transition-all duration-300 {passwordStrength === 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-yellow-400' : passwordStrength === 3 ? 'bg-green-500' : 'bg-gray-200'}"
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
		<input
			type="password"
			id="confirm-password"
			bind:value={confirmPassword}
			class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
			placeholder="••••••••"
			required
		/>
	</div>
	
	<button
		type="submit"
		disabled={loading}
		class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
	>
		{#if loading}
			<div class="loader-spin mr-2" style="width: 16px; height: 16px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12a9 9 0 1 1-6.219-8.56"/>
				</svg>
			</div>
			Registering...
		{:else}
			Register
		{/if}
	</button>
</form>

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