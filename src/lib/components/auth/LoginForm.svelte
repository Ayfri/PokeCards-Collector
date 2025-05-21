<script lang="ts">
	import { supabase } from '../../supabase';

	export let onSuccess: (() => void) | undefined = undefined;

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';
	let showReset = false;
	let resetEmail = '';
	let resetLoading = false;
	let resetMessage = '';
	let showPassword = false;

	async function handleSubmit() {
		if (!email || !password) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		loading = true;
		errorMessage = '';
		
		// Timeout for user feedback remains useful
		const loginTimeout = setTimeout(() => {
			if (loading) {
				errorMessage = 'Login is taking longer than expected. Please check your internet connection or try again later.';
				loading = false;
			}
		}, 15000); // 15 seconds

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			});

			clearTimeout(loginTimeout);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Invalid login credentials' })); // Default message if JSON parse fails
				console.error('Error during login:', response.status, errorData.message);
				errorMessage = errorData.message || 'Incorrect email or password'; // Use server message or default
				loading = false;
				return;
			}

			// Login successful - API handles session, cookies are set.
			loading = false;

			// Notify the parent component (AuthModal) of success
			onSuccess?.();

			// Let the browser handle the redirect based on cookie changes, or force reload if needed.
			// A simple reload ensures the layout server load runs again with the new session.
			window.location.href = '/'; // Or window.location.reload();

		} catch (error: any) {
			clearTimeout(loginTimeout);
			loading = false;
			console.error('Network or unexpected error during login:', error);
			if (error.message?.includes('Failed to fetch')) {
				errorMessage = 'Could not connect to the authentication service. Please check your internet connection.';
			} else {
				errorMessage = `Login failed: ${error?.message || 'Unknown error'}`;
			}
		}
	}

	async function handlePasswordReset() {
		resetMessage = '';
		if (!resetEmail) {
			resetMessage = 'Please enter your email.';
			return;
		}
		resetLoading = true;
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
				redirectTo: 'https://pokecards-collector.pages.dev/reset-password',
			});
			if (error) {
				resetMessage = error.message || 'Failed to send reset email.';
			} else {
				resetMessage = 'Password reset email sent! Check your inbox.';
			}
		} catch (e) {
			resetMessage = 'An error occurred. Please try again.';
		}
		resetLoading = false;
	}

	const togglePasswordVisibility = () => {
		showPassword = !showPassword;
	};
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
		<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			Password
		</label>
		<div class="relative">
			{#if showPassword}
				<input
					bind:value={password}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="password"
					name="password"
					placeholder="Enter your password"
					required
					type="text"
				/>
			{:else}
				<input
					bind:value={password}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="password"
					name="password"
					placeholder="Enter your password"
					required
					type="password"
				/>
			{/if}
			<button
				class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-700 dark:text-gray-300"
				on:click={togglePasswordVisibility}
				type="button"
			>
				{showPassword ? 'Hide' : 'Show'}
			</button>
		</div>
		<div class="mt-2 text-right">
			<button type="button" class="text-xs text-red-600 hover:underline focus:outline-none" on:click={() => { showReset = !showReset; resetMessage = ''; }}>
				{showReset ? 'Cancel' : 'Forgot password?'}
			</button>
		</div>
	</div>
	
	{#if showReset}
		<div class="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<label for="reset-email" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Enter your email to reset password</label>
			<input
				type="email"
				id="reset-email"
				bind:value={resetEmail}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white mb-2"
				placeholder="your@email.com"
				disabled={resetLoading}
			/>
			<button type="button"
				class="w-full py-2 px-4 bg-gold-400 text-black rounded-lg transition-all duration-[400ms] flex items-center justify-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
				on:click={handlePasswordReset}
				disabled={resetLoading}
			>
				{resetLoading ? 'Sending...' : 'Send reset email'}
			</button>
			{#if resetMessage}
				<div class="mt-2 text-xs text-center {resetMessage.includes('sent') ? 'text-gold-500' : 'text-red-600'}">{resetMessage}</div>
			{/if}
		</div>
	{/if}
	
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
			Logging in...
		{:else}
			Log in
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