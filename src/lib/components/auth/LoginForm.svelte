<script lang="ts">
	import { supabase } from '../../supabase';
	import BouncyLoader from '../BouncyLoader.svelte';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { readJson, type ApiError } from '$helpers/http';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
    import { BASE_URL } from '~/constants';

	interface Props {
		onSuccess?: (() => void) | undefined;
	}

	let { onSuccess = undefined }: Props = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let showReset = $state(false);
	let resetEmail = $state('');
	let resetLoading = $state(false);
	let resetMessage = $state('');
	let showPassword = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email || !password) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		loading = true;
		errorMessage = '';

		const loginTimeout = setTimeout(() => {
			if (loading) {
				errorMessage = 'Login is taking longer than expected. Please check your internet connection or try again later.';
				loading = false;
			}
		}, 15000);

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
				const errorData = await readJson<ApiError>(response, { message: 'Invalid login credentials' });
				console.error('Error during login:', response.status, errorData.message);
				errorMessage = errorData.message || 'Incorrect email or password';
				loading = false;
				return;
			}

			loading = false;

			onSuccess?.();

			// Invalidate all load functions to ensure session changes are picked up
			await invalidateAll();

			const currentPath = page.url.pathname;
			if (currentPath.includes('/login') || currentPath.includes('/auth') || currentPath.includes('/reset-password')) {
				goto('/');
			} else {
				goto(currentPath + page.url.search);
			}

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
				redirectTo: `${BASE_URL}/reset-password`,
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
					placeholder="Enter your password"
					required
					type="text"
				/>
			{:else}
				<input
					bind:value={password}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
					id="password"
					name="password"
					placeholder="Enter your password"
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
		<div class="mt-2 text-right">
			<button type="button" class="text-xs text-red-600 hover:underline focus:outline-hidden" onclick={() => { showReset = !showReset; resetMessage = ''; }}>
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
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white mb-2"
				placeholder="your@email.com"
				disabled={resetLoading}
			/>
			<button type="button"
				class="w-full py-2 px-4 bg-gold-400 text-black rounded-lg transition-all duration-400 flex items-center justify-center gap-2 hover:shadow-[0_0_10px_5px_rgba(255,215,0,1)] hover:shadow-gold-400/50 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
				onclick={handlePasswordReset}
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
		class="w-full py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
	>
		{#if loading}
			<BouncyLoader size={20} gradientColorStart="#FFFFFF" gradientColorEnd="#FFFFFF" />
			<span class="ml-2">Logging in...</span>
		{:else}
			Log in
		{/if}
	</button>
</form>
