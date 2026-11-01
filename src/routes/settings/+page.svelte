<script lang="ts">
	import type {ActionData, PageData} from './$types';
	import Avatar from '#lib/components/auth/Avatar.svelte';
	import ColorPicker from '#components/settings/ColorPicker.svelte';
	import Checkbox from '#components/filters/Checkbox.svelte';
	import PageTitle from '#lib/components/PageTitle.svelte';
	import {enhance} from '$app/forms';
	import {supabase} from '#lib/supabase.ts';
	import {flushSync} from 'svelte';
	import {fade, fly} from 'svelte/transition';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MailIcon from '@lucide/svelte/icons/mail';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import SaveIcon from '@lucide/svelte/icons/save';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import UserIcon from '@lucide/svelte/icons/user';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let {data, form}: Props = $props();

	/** Gold-400, the color `Avatar.svelte` falls back to. */
	const DEFAULT_PROFILE_COLOR = '#fbc54a';

	const TABS = [
		{description: 'The identity attached to your collection', icon: UserIcon, id: 'account', label: 'Account'},
		{description: 'The color that tints your avatar', icon: PaletteIcon, id: 'appearance', label: 'Appearance'},
		{description: 'Who can see your collection and wishlist', icon: ShieldIcon, id: 'privacy', label: 'Privacy'},
		{description: 'Change the password you sign in with', icon: LockIcon, id: 'security', label: 'Security'}
	] as const;

	type TabId = (typeof TABS)[number]['id'];

	let activeTab = $state<TabId>('account');
	let saving = $state(false);
	let resetPasswordLoading = $state(false);
	let resetPasswordMessage = $state('');
	let resetPasswordError = $state('');

	const user = $derived(data.user);
	const profile = $derived(data.profile);
	/** Follows the stored value, and the checkbox overrides it until the save's reload brings the stored one back. */
	let isPublic = $derived(profile?.is_public ?? false);
	let savingVisibility = $state(false);
	const memberSince = $derived(profile?.created_at
		? new Date(profile.created_at).toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'})
		: null);

	/** The stored color overrides the local one whenever the server sends a fresh profile, so a save shows without a reload. */
	let profileColor = $derived.by(() => {
		const stored = profile?.profile_color;
		return typeof stored === 'string' && /^#[0-9A-Fa-f]{6}$/.test(stored) ? stored : DEFAULT_PROFILE_COLOR;
	});

	async function handlePasswordReset() {
		if (!user?.email) {
			resetPasswordError = 'User email not found. Cannot send reset link.';
			return;
		}
		resetPasswordLoading = true;
		resetPasswordMessage = '';
		resetPasswordError = '';

		/** There is no `redirectTo` because the Recovery email template links to `{{ .SiteURL }}/auth/confirm`, which the redirect allow list does not gate. */
		const {error} = await supabase.auth.resetPasswordForEmail(user.email);

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
		<div class="gold-rule my-2"></div>
	</div>

	{#if !profile}
		<p class="alert-error text-center">
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
							<div class="flex justify-between gap-2" title={`Account created on ${memberSince}`}>
								<dt class="flex items-center gap-1.5 text-gray-400"><CalendarDaysIcon size={14} /> Member since</dt>
								<dd class="text-gray-200">{memberSince}</dd>
							</div>
						{/if}
						<div class="flex justify-between gap-2" title={profile.is_public ? 'Anyone can browse your collection and wishlist' : 'Only you can see your collection and wishlist'}>
							<dt class="flex items-center gap-1.5 text-gray-400"><ShieldIcon size={14} /> Profile</dt>
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
							title={tab.description}
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
						<h2 class="mb-1 text-xl font-bold text-gold-400 md:text-2xl">Account</h2>
						<p class="mb-5 text-sm text-gray-400">The identity attached to your collection.</p>
						<div class="grid gap-4 sm:grid-cols-2">
							{@render readOnlyField('email', 'Email', user?.email || '', 'To change your email, please contact support.')}
							{@render readOnlyField('username', 'Username', profile.username || '', 'Username cannot be changed.')}
						</div>
					</div>
				{:else if activeTab === 'appearance'}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-bold text-gold-400 md:text-2xl">Appearance</h2>
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
								class="btn-outline-gold w-fit"
								disabled={saving}
								title="Save this color to your profile"
								type="submit"
							>
								<SaveIcon size={16} />
								{saving ? "Saving..." : "Save profile color"}
							</button>
						</form>
					</div>
				{:else if activeTab === 'privacy'}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-bold text-gold-400 md:text-2xl">Privacy</h2>
						<p class="mb-5 text-sm text-gray-400">Who can see your collection and wishlist.</p>
						<!--
							Saved as soon as the box changes: the checkbox's `change` event bubbles to the form, which submits itself.
							`flushSync` first, because Svelte writes the hidden input's value in a later microtask and the submit would read the stale one.
						-->
						<form
							action="?/updateVisibility"
							class="flex flex-col gap-3 rounded-lg border border-gray-700/60 bg-gray-900/50 p-4"
							method="POST"
							onchange={event => {
								flushSync();
								event.currentTarget.requestSubmit();
							}}
							use:enhance={() => {
								savingVisibility = true;
								return async ({result, update}) => {
									await update({reset: false});
									if (result.type !== 'success') isPublic = profile?.is_public ?? false;
									savingVisibility = false;
								};
							}}
						>
							<Checkbox bind:checked={isPublic} disabled={savingVisibility} id="is-public" label="Public profile" />
							<input name="is_public" type="hidden" value={isPublic} />
							<p class="text-sm text-gray-400">
								{isPublic ? 'Anyone can browse your collection and wishlist.' : 'Only you can see your collection and wishlist.'}
							</p>
							{#if form?.visibilityError}
								<p class="text-sm text-red-400">{form.visibilityError}</p>
							{:else if form?.visibilityMessage}
								<p class="text-sm text-green-400">{form.visibilityMessage}</p>
							{/if}
						</form>
					</div>
				{:else}
					<div in:fade={{duration: 200}}>
						<h2 class="mb-1 text-xl font-bold text-gold-400 md:text-2xl">Security</h2>
						<p class="mb-5 text-sm text-gray-400">Change the password you sign in with.</p>
						<div class="flex items-center gap-3 rounded-lg border border-gray-700/60 bg-gray-900/50 p-4 text-sm text-gray-300">
							<MailIcon class="shrink-0 text-gold-400" size={18} />
							<span>We send a reset link to <span class="font-medium text-white">{user?.email}</span>, and it opens the page where you pick a new password.</span>
						</div>
						<button
							class="btn-outline-gold mt-5"
							disabled={resetPasswordLoading}
							onclick={handlePasswordReset}
							title="Email yourself a password reset link"
							type="button"
						>
							<LockIcon size={16} />
							{resetPasswordLoading ? 'Sending...' : 'Send password reset email'}
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
