<script lang="ts">
	export let onSuccess: (() => void) | undefined = undefined;

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';

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
		<input
			type="password"
			id="password"
			bind:value={password}
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