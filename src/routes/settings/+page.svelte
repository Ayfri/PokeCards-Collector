<script lang="ts">
	import type {ActionData, PageData} from './$types';
	import Avatar from '$lib/components/auth/Avatar.svelte';
	import ColorPicker from '@components/settings/ColorPicker.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import {enhance} from '$app/forms';
	import {supabase} from '$lib/supabase';
	import {fade, fly} from 'svelte/transition';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MailIcon from '@lucide/svelte/icons/mail';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import UserIcon from '@lucide/svelte/icons/user';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let {data, form}: Props = $props();

	/** Gold-400, the color Avatar.svelte falls back to. */
	const DEFAULT_PROFILE_COLOR = '#fbc54a';

	const TABS = [
		{icon: UserIcon, id: 'account', label: 'Account'},
		{icon: PaletteIcon, id: 'appearance', label: 'Appearance'},
		{icon: ShieldIcon, id: 'privacy', label: 'Privacy'},
		{icon: LockIcon, id: 'security', label: 'Security'}
	] as const;

	type TabId = (typeof TABS)[number]['id'];

	let activeTab = $state<TabId>('account');
	let profileColor = $state(DEFAULT_PROFILE_COLOR);
	let saving = $state(false);
	let resetPasswordLoading = $state(false);
	let resetPasswordMessage = $state('');
	let resetPasswordError = $state('');

	const user = $derived(data.user);
	const profile = $derived(data.profile);
	const memberSince = $derived(profile?.created_at
		? new Date(profile.created_at).toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'})
		: null);

	// The stored color wins whenever the server sends a fresh profile, so a save shows up without a reload.
	$effect(() => {
		const stored = profile?.profile_color;
		profileColor = typeof stored === 'string' && /^#[0-9A-Fa-f]{6}$/.test(stored) ? stored : DEFAULT_PROFILE_COLOR;
	});

	async function handlePasswordReset() {
		if (!user?.email) {
			resetPasswordError = 'User email not found. Cannot send reset link.';
			return;
		}
		resetPasswordLoading = true;
		resetPasswordMessage = '';
		resetPasswordError = '';

		const {error} = await supabase.auth.resetPasswordForEmail(user.email, {
			redirectTo: `${window.location.origin}/reset-password`
		});

		resetPasswordLoading = false;
		if (error) {
			resetPasswordError = error.message || 'Failed to send password reset email.';
		} else {
			resetPasswordMessage = 'Password reset email sent! Check your inbox.';
		}
	}
</script>

{#snippet readOnlyField(id: string, label: string, value: string, hint: string)}
	<div>
		<label class="mb-1 block text-sm font-medium text-gray-300" for={id}>{label}</label>
		<input
			class="w-full cursor-not-allowed rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-gray-400"
			disabled
			{id}
			type="text"
			{value}
		/>
		<p class="mt-1 text-xs text-gray-500">{hint}</p>
	</div>
{/snippet}

<main class="container mx-auto px-4 pb-12 text-white">
	<div class="w-full pb-4 lg:pb-5">
		<div class="mx-4 flex items-center justify-between lg:mx-28">
			<PageTitle title="Settings" />
		</div>
		<div class="mx-auto my-2 h-1 w-full max-w-[800px] bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>
	</div>

	{#if !profile}
		<p class="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">
			Your profile could not be loaded. Try reloading the page.
		</p>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]" in:fly={{y: 20, duration: 400}}>
			<aside class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
				<div class="rounded-xl border border-gray-700/60 bg-linear-to-br from-gray-800 to-gray-900 p-5 shadow-xl">
					<div class="flex items-center gap-4">
						<Avatar profileColor={profileColor} size="size-14 text-2xl" username={profile.username || 'U'} />
						<div class="min-w-0">
							<h2 class="truncate text-lg font-semibold text-gold-400">{profile.username}</h2>
							<p class="truncate text-sm text-gray-400">{user?.email}</p>
						</div>
					</div>
					<dl class="mt-4 space-y-2 border-t border-gray-700 pt-4 text-sm">
						{#if memberSince}
							<div class="flex justify-between gap-2">
								<dt class="text-gray-400">Member since</dt>
								<dd class="text-gray-200">{memberSince}</dd>
							</div>
						{/if}
						<div class="flex justify-between gap-2">
							<dt class="text-gray-400">Profile</dt>
							<dd class="flex items-center gap-1 {profile.is_public ? 'text-green-400' : 'text-gray-300'}">
								{#if profile.is_public}
									<EyeIcon size={14} /> Public
								{:else}
									<EyeOffIcon size={14} /> Private
								{/if}
							</dd>
						</div>
					</dl>
				</div>

				<nav class="flex gap-1 overflow-x-auto rounded-xl border border-gray-700/60 bg-gray-900/60 p-2 lg:flex-col lg:overflow-visible">
					{#each TABS as tab (tab.id)}
						{@const Icon = tab.icon}
						<button
							class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200 lg:w-full
								{activeTab === tab.id ? 'bg-gold-400/15 text-gold-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}"
							onclick={() => (activeTab = tab.id)}
							type="button"
						>
							<Icon size={16} />
							{tab.label}
						</button>
					{/each}
				</nav>
			</aside>

			<section class="rounded-xl border border-gray-700/60 bg-linear-to-br from-gray-800 to-gray-900 p-6 shadow-xl">
				{#if activeTab === 'account'}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-semibold text-gold-400">Account</h2>
						<p class="mb-5 text-sm text-gray-400">The identity attached to your collection.</p>
						<div class="grid gap-4 sm:grid-cols-2">
							{@render readOnlyField('email', 'Email', user?.email || '', 'To change your email, please contact support.')}
							{@render readOnlyField('username', 'Username', profile.username || '', 'Username cannot be changed.')}
						</div>
					</div>
				{:else if activeTab === 'appearance'}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-semibold text-gold-400">Appearance</h2>
						<p class="mb-5 text-sm text-gray-400">Your color tints your avatar everywhere on the site.</p>

						<form
							action="?/updateProfile"
							class="flex flex-col gap-5"
							method="POST"
							use:enhance={() => {
								saving = true;
								return async ({update}) => {
									await update({reset: false});
									saving = false;
								};
							}}
						>
							<div class="flex items-center gap-4 rounded-lg border border-gray-700/60 bg-gray-900/50 p-4">
								<Avatar profileColor={profileColor} size="size-16 text-3xl" username={profile.username || 'U'} />
								<div>
									<p class="font-medium text-white">Live preview</p>
									<p class="font-mono text-sm text-gray-400">{profileColor}</p>
								</div>
							</div>

							<ColorPicker bind:value={profileColor} defaultValue={DEFAULT_PROFILE_COLOR} />
							<input name="profile_color" type="hidden" value={profileColor} />

							{#if form?.error}
								<p class="text-sm text-red-400">{form.error}</p>
							{:else if form?.success}
								<p class="text-sm text-green-400">{form.message}</p>
							{/if}

							<button
								class="animated-hover-button relative inline-flex w-fit items-center justify-center overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
								disabled={saving}
								type="submit"
							>
								<span class="relative z-10">{saving ? 'Saving...' : 'Save profile color'}</span>
							</button>
						</form>
					</div>
				{:else if activeTab === 'privacy'}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-semibold text-gold-400">Privacy</h2>
						<p class="mb-5 text-sm text-gray-400">Who can see your collection and wishlist.</p>
						<p class="mb-4 text-sm text-gray-300">
							Your profile is currently <span class={profile.is_public ? 'text-green-400' : 'text-gray-100'}>{profile.is_public ? 'public' : 'private'}</span>.
							{profile.is_public ? 'Anyone can browse your collection and wishlist.' : 'Only you can see your collection and wishlist.'}
							Visibility is toggled from your profile page.
						</p>
						<a
							class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300 hover:text-black"
							href="/profile"
						>
							<span class="relative z-10 flex items-center gap-2"><ShieldIcon size={16} /> Go to profile settings</span>
						</a>
					</div>
				{:else}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-semibold text-gold-400">Security</h2>
						<p class="mb-5 text-sm text-gray-400">Change the password you sign in with.</p>
						<div class="flex items-center gap-3 rounded-lg border border-gray-700/60 bg-gray-900/50 p-4 text-sm text-gray-300">
							<MailIcon class="shrink-0 text-gold-400" size={18} />
							<span>We send a reset link to <span class="font-medium text-white">{user?.email}</span>, and it opens the page where you pick a new password.</span>
						</div>
						<button
							class="animated-hover-button relative mt-5 inline-flex items-center justify-center overflow-hidden rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
							disabled={resetPasswordLoading}
							onclick={handlePasswordReset}
							type="button"
						>
							<span class="relative z-10 flex items-center gap-2">
								<LockIcon size={16} />
								{resetPasswordLoading ? 'Sending...' : 'Send password reset email'}
							</span>
						</button>
						{#if resetPasswordMessage}
							<p class="mt-3 text-sm text-green-400">{resetPasswordMessage}</p>
						{/if}
						{#if resetPasswordError}
							<p class="mt-3 text-sm text-red-400">{resetPasswordError}</p>
						{/if}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</main>

<style>
	.animated-hover-button::before {
		background-color: #fbc54a;
		bottom: 0;
		content: '';
		height: 0;
		left: 0;
		position: absolute;
		transition: height 0.3s ease-in-out;
		width: 100%;
		z-index: 0;
	}

	.animated-hover-button:not(:disabled):hover::before {
		height: 100%;
	}
</style>
