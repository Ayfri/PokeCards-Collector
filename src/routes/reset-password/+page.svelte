<script lang="ts">
	import { enhance } from '$app/forms';
	import BouncyLoader from '$lib/components/BouncyLoader.svelte';
	import { PASSWORD_CRITERIA } from '$helpers/password';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let password = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);

	const met = $derived(PASSWORD_CRITERIA.map(criterion => criterion.test(password)));
	const strength = $derived(met.filter(Boolean).length);
	const strengthColor = $derived(['bg-gray-700', 'bg-red-500', 'bg-yellow-400', 'bg-green-500'][strength]);
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
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-300" for="password">New password</label>
				<div class="relative">
					<input
						autocomplete="new-password"
						bind:value={password}
						class="w-full rounded-md border border-gray-700/60 bg-gray-900/50 px-3 py-2 pr-10 text-white placeholder-gray-500 focus:border-gold-400 focus:outline-hidden"
						id="password"
						name="password"
						placeholder="••••••••"
						required
						type={showPassword ? 'text' : 'password'}
					/>
					<button
						class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors hover:text-gold-400"
						onclick={() => (showPassword = !showPassword)}
						title={showPassword ? 'Hide password' : 'Show password'}
						type="button"
					>
						{#if showPassword}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
					</button>
				</div>

				<div class="mt-2 h-1.5 w-full rounded-sm bg-gray-800">
					<div class={['h-1.5 rounded-sm transition-all duration-300', strengthColor]} style="width: {(strength / PASSWORD_CRITERIA.length) * 100}%"></div>
				</div>
				<ul class="mt-2 space-y-0.5 text-xs text-gray-500">
					{#each PASSWORD_CRITERIA as criterion, index (criterion.id)}
						<li class={met[index] ? 'text-green-400' : ''}>• {criterion.label}</li>
					{/each}
				</ul>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium text-gray-300" for="confirm-password">Confirm new password</label>
				<input
					autocomplete="new-password"
					class="w-full rounded-md border border-gray-700/60 bg-gray-900/50 px-3 py-2 text-white placeholder-gray-500 focus:border-gold-400 focus:outline-hidden"
					id="confirm-password"
					name="confirmPassword"
					placeholder="••••••••"
					required
					type={showPassword ? 'text' : 'password'}
				/>
			</div>

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
