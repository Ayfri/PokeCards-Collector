<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import User from 'lucide-svelte/icons/user';
	import LogOut from 'lucide-svelte/icons/log-out';
	import Heart from 'lucide-svelte/icons/heart';
	import Library from 'lucide-svelte/icons/library';
	import Settings from 'lucide-svelte/icons/settings';
	import { page } from '$app/stores';
	import AuthModal from './AuthModal.svelte';
	import { browser } from '$app/environment';
	import Avatar from './Avatar.svelte';
	import { setNavigationLoading } from '$lib/stores/loading';
	import type { UserProfile } from '$lib/types';
	import type { User as AuthUser } from '@supabase/supabase-js';
	import { goto, invalidateAll } from '$app/navigation';

	let isMenuOpen = false;
	let isAuthModalOpen = false;
	let menuElement: HTMLElement;

	$: user = $page.data.user as AuthUser | null;
	$: profile = $page.data.profile as UserProfile | null;

	export let userProp: AuthUser | null = $page.data.user as AuthUser | null;
	export let profileProp: UserProfile | null = $page.data.profile as UserProfile | null;

	$: {
		userProp = $page.data.user as AuthUser | null;
		profileProp = $page.data.profile as UserProfile | null;
	}

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function handleNavigation() {
		closeMenu();
		setNavigationLoading(true);
	}

	function openAuthModal() {
		closeMenu();
		isAuthModalOpen = true;
	}

	function closeAuthModal() {
		isAuthModalOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (menuElement && !menuElement.contains(event.target as Node) && isMenuOpen) {
			const targetButton = (event.target as Element).closest('button[aria-expanded]');
			if (!targetButton || targetButton !== menuElement.previousElementSibling) {
				closeMenu();
			}
		}
	}

	async function handleSignOut() {
		closeMenu();
		setNavigationLoading(true);
		try {
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
			});

			if (!response.ok) {
				console.error('Logout failed:', response.statusText);
				setNavigationLoading(false);
				return;
			}

			await invalidateAll();
			const currentPath = $page.url.pathname;
			const currentSearch = $page.url.search;
			goto(currentPath + currentSearch);

		} catch (error) {
			console.error('An error occurred during sign out:', error);
			setNavigationLoading(false);
			await invalidateAll();
			const currentPath = $page.url.pathname;
			const currentSearch = $page.url.search;
			goto(currentPath + currentSearch);
		}
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('click', handleClickOutside, true);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div class="relative">
	<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

	<button
		type="button"
		class="flex items-center justify-center size-9 text-gray-400 hover:text-white rounded-full focus:outline-none"
		on:click={() => {
			if (userProp && profileProp) {
				toggleMenu();
			} else {
				openAuthModal();
			}
		}}
		aria-expanded={isMenuOpen}
	>
		{#if userProp && profileProp}
			<span class="sr-only">Open user menu</span>
			<Avatar username={profileProp.username} profileColor={profileProp.profile_color} />
		{:else}
			<span class="sr-only">Sign in</span>
			<User size={24} />
		{/if}
	</button>

	{#if isMenuOpen}
		<div
			bind:this={menuElement}
			transition:fly={{ y: -10, duration: 200 }}
			class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
			role="menu"
			aria-orientation="vertical"
			aria-labelledby="user-menu-button"
			tabindex="-1"
		>
			{#if userProp && profileProp}
				<div class="py-2 px-3 border-b dark:border-gray-700">
					<p class="text-sm font-medium text-gray-900 dark:text-white">{profileProp.username}</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{userProp.email}</p>
				</div>
				<div class="py-1">
					<a
						href={`/profile/${encodeURIComponent(profileProp.username)}`}
						target="_self"
						class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
						role="menuitem"
						on:click={handleNavigation}
					>
						<User class="mr-3" size={16} />
						My profile
					</a>
					<a
						href={`/collection/${encodeURIComponent(profileProp.username)}`}
						target="_self"
						class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
						role="menuitem"
						on:click={handleNavigation}
					>
						<Library class="mr-3" size={16} />
						My collection
					</a>
					<a
						href={`/wishlist/${encodeURIComponent(profileProp.username)}`}
						target="_self"
						class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
						role="menuitem"
						on:click={handleNavigation}
					>
						<Heart class="mr-3" size={16} />
						My wishlist
					</a>
					<a
						href="/settings"
						class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
						role="menuitem"
						on:click={handleNavigation}
					>
						<Settings class="mr-3" size={16} />
						Settings
					</a>
					<button
						type="button"
						class="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
						role="menuitem"
						on:click={handleSignOut}
					>
						<LogOut class="mr-3" size={16} />
						Sign out
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
