<script lang="ts">
	import { supabase } from '../../supabase';
	import BouncyLoader from '../BouncyLoader.svelte';
	import PasswordField from './PasswordField.svelte';
	import { finishSignIn, readJson, type ApiError } from '#helpers/utils.ts';

	interface Props {
		onSuccess?: () => void;
	}

	let { onSuccess }: Props = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let showReset = $state(false);
	let resetEmail = $state('');
	let resetLoading = $state(false);
	let resetMessage = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email || !password) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
				signal: AbortSignal.timeout(15_000),
			});

			if (!response.ok) {
				const errorData = await readJson<ApiError>(response, { message: 'Invalid login credentials' });
				console.error('Error during login:', response.status, errorData.message);
				errorMessage = errorData.message || 'Incorrect email or password';
				return;
			}

			onSuccess?.();
			await finishSignIn();
		} catch (error: unknown) {
			console.error('Network or unexpected error during login:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			if (error instanceof DOMException && error.name === 'TimeoutError') {
				errorMessage = 'Login is taking longer than expected. Please check your internet connection or try again later.';
			} else if (message.includes('Failed to fetch')) {
				errorMessage = 'Could not connect to the authentication service. Please check your internet connection.';
			} else {
				errorMessage = `Login failed: ${message}`;
			}
		} finally {
			loading = false;
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
			/** No `redirectTo`: the Recovery email template already links to `{{ .SiteURL }}/auth/confirm`, which the redirect allow list does not gate. */
			const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
			resetMessage = error ? error.message || 'Failed to send reset email.' : 'Password reset email sent! Check your inbox.';
		} catch {
			resetMessage = 'An error occurred. Please try again.';
		}
		resetLoading = false;
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	{#if errorMessage}
		<div class="alert-error">{errorMessage}</div>
	{/if}

	<div>
		<label for="email" class="form-label">Email</label>
		<input type="email" id="email" bind:value={email} class="form-input" placeholder="your@email.com" required />
	</div>

	<div>
		<PasswordField autocomplete="current-password" id="password" label="Password" name="password" placeholder="Enter your password" bind:value={password} />
		<div class="mt-2 text-right">
			<button
				type="button"
				class="rounded-sm text-xs text-gold-400 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400"
				onclick={() => { showReset = !showReset; resetMessage = ''; }}
			>
				{showReset ? 'Cancel' : 'Forgot password?'}
			</button>
		</div>
	</div>

	{#if showReset}
		<div class="space-y-2">
			<label for="reset-email" class="form-label">Enter your email to reset password</label>
			<input
				type="email"
				id="reset-email"
				bind:value={resetEmail}
				class="form-input"
				placeholder="your@email.com"
				disabled={resetLoading}
			/>
			<button type="button" class="btn-gold w-full" onclick={handlePasswordReset} disabled={resetLoading}>
				{resetLoading ? 'Sending...' : 'Send reset email'}
			</button>
			{#if resetMessage}
				<div class={['text-center text-xs', resetMessage.includes('sent') ? 'text-green-400' : 'text-red-400']}>{resetMessage}</div>
			{/if}
		</div>
	{/if}

	<button type="submit" disabled={loading} class="btn-gold w-full">
		{#if loading}
			<BouncyLoader size={20} gradientColorStart="#000000" gradientColorEnd="#000000" />
			Logging in...
		{:else}
			Log in
		{/if}
	</button>
</form>
