<script lang="ts">
	import { enhance } from '$app/forms';
	import BouncyLoader from '#lib/components/BouncyLoader.svelte';
	import PasswordField from '#components/auth/PasswordField.svelte';
	import LockIcon from '@lucide/svelte/icons/lock';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let password = $state('');
	let confirmation = $state('');
	let submitting = $state(false);
</script>

<main class="mx-auto w-full max-w-md px-4 py-16">
	<h1 class="mb-1 text-2xl font-bold text-gold-400">Reset your password</h1>

	{#if form?.success}
		<p class="mb-5 text-sm text-gray-400">Your new password is active on every device.</p>
		<p class="alert-success">{form.message}</p>
		<a class="btn-outline-gold mt-5" href="/" title="Back to the card catalogue">Back to the catalogue</a>
	{:else if !data.recovered}
		<p class="mb-5 text-sm text-gray-400">This page opens from a reset email.</p>
		<p class="alert-error">
			{data.authError === 'expired_link'
				? 'That reset link has expired or was already used. Reset links are valid once, and only for a short while.'
				: 'This page needs a valid reset link. Ask for a new one from the login form.'}
		</p>
		<a class="btn-outline-gold mt-5" href="/" title="Back to the card catalogue">Back to the catalogue</a>
	{:else}
		<p class="mb-5 text-sm text-gray-400">Pick the password you will sign in with from now on.</p>

		{#if form?.message}
			<p class="alert-error mb-4">{form.message}</p>
		{/if}

		<form
			class="space-y-4"
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			<PasswordField autocomplete="new-password" id="password" label="New password" name="password" placeholder="••••••••" strength bind:value={password} />
			<PasswordField autocomplete="new-password" id="confirm-password" label="Confirm new password" name="confirmPassword" placeholder="••••••••" bind:value={confirmation} />

			<button
				class="btn-outline-gold w-full disabled:cursor-not-allowed disabled:opacity-50"
				disabled={submitting}
				title="Save this password"
				type="submit"
			>
				{#if submitting}
					<BouncyLoader gradientColorEnd="var(--color-gold-400)" gradientColorStart="var(--color-gold-400)" size={20} />
					Updating...
				{:else}
					<LockIcon size={16} />
					Update password
				{/if}
			</button>
		</form>
	{/if}
</main>
