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
		<p class="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-400">{form.message}</p>
		<a
			class="animated-hover-button relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300"
			href="/"
			title="Back to the card catalogue"
		>
			<span class="relative z-10">Back to the catalogue</span>
		</a>
	{:else if !data.recovered}
		<p class="mb-5 text-sm text-gray-400">This page opens from a reset email.</p>
		<p class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
			{data.authError === 'expired_link'
				? 'That reset link has expired or was already used. Reset links are valid once, and only for a short while.'
				: 'This page needs a valid reset link. Ask for a new one from the login form.'}
		</p>
		<a
			class="animated-hover-button relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300"
			href="/"
			title="Back to the card catalogue"
		>
			<span class="relative z-10">Back to the catalogue</span>
		</a>
	{:else}
		<p class="mb-5 text-sm text-gray-400">Pick the password you will sign in with from now on.</p>

		{#if form?.message}
			<p class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">{form.message}</p>
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
				class="animated-hover-button relative flex w-full items-center justify-center overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={submitting}
				title="Save this password"
				type="submit"
			>
				<span class="relative z-10 flex items-center gap-2">
					{#if submitting}
						<BouncyLoader gradientColorEnd="#fbc54a" gradientColorStart="#fbc54a" size={20} />
						Updating...
					{:else}
						<LockIcon size={16} />
						Update password
					{/if}
				</span>
			</button>
		</form>
	{/if}
</main>
