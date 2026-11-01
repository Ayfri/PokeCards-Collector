<script lang="ts">
	import PageTitle from '#components/PageTitle.svelte';
	import House from '@lucide/svelte/icons/house';
	import Search from '@lucide/svelte/icons/search';
	import type { LucideIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		children: Snippet;
		icon: LucideIcon;
		iconClass?: string;
		showSearchUsers?: boolean;
		title: string;
	}

	let { children, icon: Icon, iconClass = 'text-gold-400', showSearchUsers = false, title }: Props = $props();
</script>

<main class="flex grow flex-col items-center justify-center space-y-5 p-6 text-center" in:fade={{ duration: 300, delay: 100 }}>
	<div class="mb-4" in:fly={{ y: 20, duration: 400, delay: 200 }}>
		<Icon class={`mx-auto ${iconClass}`} size={64} />
	</div>

	<div in:fly={{ y: 20, duration: 400, delay: 300 }}>
		<PageTitle {title} />
	</div>

	<p class="max-w-md text-lg text-gray-300" in:fly={{ y: 20, duration: 400, delay: 400 }}>
		{@render children()}
	</p>

	<div class="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row" in:fly={{ y: 20, duration: 400, delay: 500 }}>
		<a class="btn-outline-gold" href="/" title="Back to the home page">
			<House size={18} />
			Return to Home
		</a>
		{#if showSearchUsers}
			<a class="btn-outline-gold" href="/users" title="Find another collector">
				<Search size={18} />
				Search Users
			</a>
		{/if}
	</div>
</main>
