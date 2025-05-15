<script lang="ts">
import { onMount } from 'svelte';
import { supabase } from '../../lib/supabase';
import { page } from '$app/stores';
import { goto } from '$app/navigation';

let password = '';
let confirmPassword = '';
let loading = false;
let errorMessage = '';
let successMessage = '';
let token = '';
let type = '';

// Get token from URL or hash
onMount(() => {
	const url = new URL(window.location.href);
	token = url.searchParams.get('token') || '';
	type = url.searchParams.get('type') || '';

	// If not found in query params, check hash
	if (!token || !type) {
		const hash = window.location.hash.substring(1); // remove '#'
		const params = new URLSearchParams(hash);
		token = token || params.get('access_token') || params.get('token') || '';
		type = type || params.get('type') || '';
	}

	if (!token || type !== 'recovery') {
		errorMessage = 'Invalid or missing recovery token.';
	}
});

async function handleReset() {
	errorMessage = '';
	successMessage = '';
	if (!password || !confirmPassword) {
		errorMessage = 'Please fill in all fields.';
		return;
	}
	if (password !== confirmPassword) {
		errorMessage = 'Passwords do not match.';
		return;
	}
	if (password.length < 8) {
		errorMessage = 'Password must be at least 8 characters.';
		return;
	}
	loading = true;
	const { error } = await supabase.auth.updateUser({ password });
	loading = false;
	if (error) {
		errorMessage = error.message || 'Failed to reset password.';
		return;
	}
	successMessage = 'Password updated! You can now log in.';
	setTimeout(() => goto('/'), 2000);
}
</script>

<div class="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
	<h1 class="text-2xl font-bold mb-4 text-center">Reset your password</h1>
	{#if errorMessage}
		<div class="mb-4 p-3 bg-red-100 text-red-800 rounded">{errorMessage}</div>
	{/if}
	{#if successMessage}
		<div class="mb-4 p-3 bg-green-100 text-green-800 rounded">{successMessage}</div>
	{/if}
	<form on:submit|preventDefault={handleReset} class="space-y-4">
		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
				placeholder="••••••••"
				required
				minlength="8"
			/>
		</div>
		<div>
			<label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</label>
			<input
				type="password"
				id="confirm-password"
				bind:value={confirmPassword}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
				placeholder="••••••••"
				required
				minlength="8"
			/>
		</div>
		<button
			type="submit"
			disabled={loading}
			class="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
		>
			{#if loading}
				<span>Updating...</span>
			{:else}
				Update password
			{/if}
		</button>
	</form>
</div> 