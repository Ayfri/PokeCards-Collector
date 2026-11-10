<script lang="ts">
	import BouncyLoader from '../BouncyLoader.svelte';
	import PasswordField from './PasswordField.svelte';
	import { type ApiError, finishSignIn, readJson } from '#helpers/utils.ts';
	import { isStrongPassword, normalizeUsername, PASSWORD_REQUIREMENTS, USERNAME_PATTERN, USERNAME_REQUIREMENTS } from '#src/constants.ts';

	interface Props {
		onSuccess?: () => void;
		onSwitch?: (tab: 'login' | 'register') => void;
	}

	let { onSuccess, onSwitch }: Props = $props();

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	async function validateUsername() {
		if (!USERNAME_PATTERN.test(normalizeUsername(username))) {
			errorMessage = USERNAME_REQUIREMENTS;
			return false;
		}

		try {
			const response = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`);
			const data = await readJson<{ exists?: boolean; success?: boolean; }>(response, {});

			if (!data.success) {
				errorMessage = 'Error checking username availability';
				return false;
			}

			if (data.exists) {
				errorMessage = 'This username is already taken';
				return false;
			}

			return true;
		} catch (error) {
			console.error('Error checking username:', error);
			errorMessage = 'Error checking username availability';
			return false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email || !username || !password || !confirmPassword) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		if (!isStrongPassword(password)) {
			errorMessage = PASSWORD_REQUIREMENTS;
			return;
		}

		/** Loading starts before the username check, so the button is disabled for the whole submit and cannot fire it twice. */
		loading = true;
		errorMessage = '';

		try {
			if (!(await validateUsername())) return;

			/** One 15 s budget for the signup and the automatic login that follows it. */
			const signal = AbortSignal.timeout(15_000);
			const headers = { 'Content-Type': 'application/json' };

			const signupResponse = await fetch('/api/auth/signup', { body: JSON.stringify({ email, password, username }), headers, method: 'POST', signal });

			if (!signupResponse.ok) {
				const errorData = await readJson<ApiError>(signupResponse, {});
				const message = errorData.message || errorData.error || 'Error during registration';
				errorMessage = message.includes('already registered')
					? 'This email is already registered'
					: message.includes('already taken')
						? 'This username is already taken'
						: message;
				return;
			}

			const loginResponse = await fetch('/api/auth/login', { body: JSON.stringify({ email, password }), headers, method: 'POST', signal });

			if (!loginResponse.ok) {
				console.error('Automatic sign in failed after signup:', loginResponse.status);
				const errorData = await readJson<ApiError>(loginResponse, {});
				errorMessage = `Registration successful, but automatic login failed. ${errorData.message || 'Please log in manually.'}`;
				onSwitch?.('login');
				return;
			}

			onSuccess?.();
			await finishSignIn();
		} catch (error: unknown) {
			console.error('Network or fetch error during signup/login process:', error);
			errorMessage = error instanceof DOMException && error.name === 'TimeoutError'
				? 'Registration is taking longer than expected. Please check your internet connection or try again later.'
				: 'An error occurred while communicating with the server. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
	{#if errorMessage}
		<div class="alert-error">{errorMessage}</div>
	{/if}

	<div>
		<label class="form-label" for="email">Email</label>
		<input bind:value={email} class="form-input" id="email" placeholder="your@email.com" required type="email" />
	</div>

	<div>
		<label class="form-label" for="username">Username</label>
		<input bind:value={username} class="form-input" id="username" maxlength="20" placeholder="username" required type="text" />
	</div>

	<PasswordField autocomplete="new-password" bind:value={password} id="password" label="Password" name="password" placeholder="Choose a strong password" strength />

	<PasswordField autocomplete="new-password" bind:value={confirmPassword} id="confirm-password" label="Confirm Password" name="confirm-password" placeholder="••••••••" />

	<button class="btn-gold w-full" disabled={loading} type="submit">
		{#if loading}
			<BouncyLoader gradientColorEnd="#000000" gradientColorStart="#000000" size={20} />
			Registering...
		{:else}
			Register
		{/if}
	</button>
</form>
