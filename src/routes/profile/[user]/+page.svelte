<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import PageTitle from '@components/PageTitle.svelte';
	import Avatar from '@components/auth/Avatar.svelte';
	import { NO_IMAGES } from '$lib/images';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleEuro from '@lucide/svelte/icons/circle-euro';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import House from '@lucide/svelte/icons/house';
	import Layers from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const currencyFormatter = new Intl.NumberFormat('en-US', { currency: 'EUR', style: 'currency' });
	const formatCurrency = (value: number | undefined | null) => value === undefined || value === null ? 'N/A' : currencyFormatter.format(value);

	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	const { collectionStats, isOwnProfile, isPublic, sets, targetProfile, totalCards } = $derived(data);
	const username = $derived(targetProfile.username);
	const setsByName = $derived(new Map(sets.map(set => [set.name, set])));
	const sortedSets = $derived(Object.entries(collectionStats?.set_completion ?? {}).sort((a, b) => b[1].percentage - a[1].percentage));
	const averageCompletion = $derived(sortedSets.length ? sortedSets.reduce((sum, [, set]) => sum + set.percentage, 0) / sortedSets.length : 0);

	async function handleToggleVisibility() {
		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const newVisibility = !isPublic;
			const { data: updatedProfile, error } = await toggleProfileVisibility(username, newVisibility);

			if (error) {
				errorMessage = `Failed to update profile visibility: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
				return;
			}

			if (!updatedProfile) {
				errorMessage = 'No data returned from server after toggle.';
				return;
			}

			// The toggle writes through the browser client, so the page data has to be reloaded to reflect it.
			await invalidateAll();
			successMessage = `Profile visibility changed to ${newVisibility ? 'public' : 'private'}.`;
			setTimeout(() => successMessage = '', 3000);
		} catch (error) {
			errorMessage = `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}.`;
		} finally {
			isLoading = false;
		}
	}
</script>

<main class="container mx-auto overflow-x-hidden px-4 pb-8 text-white">
	<div class="w-full pb-4 lg:pb-5">
		<div in:fly|global={{ y: 50, duration: 400, delay: 200 }}>
			<div class="mx-4 flex items-center justify-between lg:mx-28">
				<PageTitle title={data.title} />
			</div>
			<div class="mx-auto my-2 h-1 w-full max-w-200 bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>
		</div>
	</div>

	{#if !isPublic && !isOwnProfile}
		<div class="flex grow flex-col items-center justify-center p-8 text-center" in:fly|global={{ y: 50, duration: 400, delay: 300 }}>
			<p class="mb-4 text-3xl font-bold text-gold-400">{data.title}</p>
			<p class="mb-4 text-gray-300">{data.description}</p>
			<a
				href="/"
				class="animated-hover-button mt-4 flex h-8 items-center rounded-sm border-2 border-gold-400 px-4 py-1.5 text-sm font-medium text-gold-400 transition-all duration-300"
			>
				<span class="relative z-10 flex items-center gap-2">
					<House size={16} />
					Return to Home
				</span>
			</a>
		</div>
	{:else}
		{#if successMessage}
			<p class="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300" in:fly={{ y: -20, duration: 300 }}>{successMessage}</p>
		{/if}

		{#if errorMessage}
			<p class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300" in:fly={{ y: -20, duration: 300 }}>{errorMessage}</p>
		{/if}

		<div in:fly|global={{ y: 50, duration: 400, delay: 350 }}>
			<div class="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
				<div class="rounded-xl border border-gray-700/60 bg-linear-to-br from-gray-800 to-gray-900 p-6 shadow-xl" in:fly={{ y: 20, duration: 300, delay: 50 }}>
					<div class="mb-6 flex items-center gap-4">
						<Avatar profileColor={targetProfile.profile_color} size="size-16 text-3xl" {username} />
						<div class="min-w-0">
							<h2 class="truncate text-xl font-semibold text-gold-400">{username}</h2>
							{#if isOwnProfile && data.user?.email}
								<p class="truncate text-sm text-gray-400">{data.user.email}</p>
							{/if}
						</div>
					</div>

					{#if isOwnProfile}
						<div class="border-t border-gray-700 pt-4">
							<div class="mb-4">
								<span class="text-sm font-medium text-gray-400">Profile visibility:</span>
								<span
									class="ml-2 inline-flex items-center gap-1 text-sm text-gold-400"
									title={isPublic ? 'Anyone can browse your collection and wishlist' : 'Only you can see your collection and wishlist'}
								>
									{#if isPublic}<EyeIcon size={14} />{:else}<EyeOffIcon size={14} />{/if}
									{isPublic ? 'Public' : 'Private'}
								</span>
							</div>

							<button
								type="button"
								class="animated-hover-button flex w-full items-center justify-center rounded-md border-2 border-gold-400 px-4 py-2 text-sm font-medium text-gold-400 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={handleToggleVisibility}
								disabled={isLoading}
								title={isPublic ? 'Hide your collection and wishlist from other users' : 'Let other users browse your collection and wishlist'}
							>
								<span class="relative z-10 flex items-center gap-2">
									{#if isLoading}
										<LoaderCircle class="animate-spin" size={16} />
										Processing...
									{:else}
										{isPublic ? 'Make my profile private' : 'Make my profile public'}
									{/if}
								</span>
							</button>
						</div>
					{/if}
				</div>

				<div class="rounded-xl border border-gray-700/60 bg-linear-to-br from-gray-800 to-gray-900 p-6 shadow-xl lg:col-span-2" in:fly={{ y: 20, duration: 300, delay: 100 }}>
					<h2 class="mb-4 text-xl font-semibold text-gold-400">{isOwnProfile ? 'My' : `${username}'s`} Collections</h2>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<a
							href={`/collection/${encodeURIComponent(username)}`}
							class="block rounded-lg border border-transparent bg-gray-800/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400"
							title={isOwnProfile ? 'Browse every card you own' : `Browse ${username}'s collected cards`}
						>
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-3">
									<BookOpen class="text-gold-400" size={20} />
									<h3 class="text-lg font-medium text-white">{isOwnProfile ? 'My Collection' : `${username}'s Collection`}</h3>
								</div>
								{#if collectionStats}
									<span class="text-xs text-gold-400/80">{formatCurrency(collectionStats.total_value)}</span>
								{/if}
							</div>
							<p class="mt-2 text-sm text-gray-400">Browse all collected cards</p>
						</a>

						<a
							href={`/wishlist/${encodeURIComponent(username)}`}
							class="block rounded-lg border border-transparent bg-gray-800/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400"
							title={isOwnProfile ? 'Browse every card on your wishlist' : `Browse ${username}'s wishlist`}
						>
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-3">
									<ListTodo class="text-gold-400" size={20} />
									<h3 class="text-lg font-medium text-white">{isOwnProfile ? 'My Wishlist' : `${username}'s Wishlist`}</h3>
								</div>
								{#if collectionStats}
									<span class="text-xs text-gold-400/80">{formatCurrency(collectionStats.wishlist_total_value)}</span>
								{/if}
							</div>
							<p class="mt-2 text-sm text-gray-400">View cards on the wishlist</p>
						</a>
					</div>
				</div>
			</div>

			{#if collectionStats}
				<div class="mb-10 rounded-xl border border-gray-700/60 bg-linear-to-br from-gray-800 to-gray-900 p-6 shadow-xl" in:fly|global={{ y: 50, duration: 400, delay: 450 }}>
					<h2 class="mb-6 text-xl font-semibold text-gold-400">Collection Statistics</h2>

					<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<div class="text-center" title="Every copy owned, duplicates included">
							<Layers class="mx-auto mb-1 text-gold-400/70" size={20} />
							<span class="mb-2 block text-3xl font-bold text-gold-400 md:text-4xl">{collectionStats.total_instances}</span>
							<span class="text-sm text-gray-400">Total Cards</span>
						</div>
						<div class="text-center" title={`${collectionStats.unique_cards} distinct cards out of ${totalCards} in the database`}>
							<Sparkles class="mx-auto mb-1 text-gold-400/70" size={20} />
							<div class="mb-2 flex items-center justify-center gap-1">
								<span class="text-3xl font-bold text-gold-400 md:text-4xl">{collectionStats.unique_cards}</span>
								<span class="text-sm text-gray-500">/ {totalCards}</span>
							</div>
							<span class="text-sm text-gray-400">Unique Cards</span>
						</div>
						<div class="text-center" title="Cards on the wishlist">
							<ListTodo class="mx-auto mb-1 text-gold-400/70" size={20} />
							<span class="mb-2 block text-3xl font-bold text-gold-400 md:text-4xl">{collectionStats.wishlist_count}</span>
							<span class="text-sm text-gray-400">Wishlist Cards</span>
						</div>
						<div class="text-center" title="Sets with at least one card collected">
							<LibraryIcon class="mx-auto mb-1 text-gold-400/70" size={20} />
							<span class="mb-2 block text-3xl font-bold text-gold-400 md:text-4xl">{sortedSets.length}</span>
							<span class="text-sm text-gray-400">Different Sets</span>
						</div>
						<div class="text-center" title="Cardmarket value of the whole collection">
							<CircleEuro class="mx-auto mb-1 text-gold-400/70" size={20} />
							<span class="mb-2 block text-3xl font-bold text-gold-400 md:text-4xl">{formatCurrency(collectionStats.total_value)}</span>
							<span class="text-sm text-gray-400">Collection Value</span>
						</div>
						<div class="text-center" title="Completion averaged over the sets with at least one card collected">
							<ChartColumn class="mx-auto mb-1 text-gold-400/70" size={20} />
							<span class="mb-2 block text-3xl font-bold text-gold-400 md:text-4xl">{averageCompletion.toFixed(1)}%</span>
							<span class="text-sm text-gray-400">Avg. Set Completion</span>
						</div>
					</div>

					{#if sortedSets.length > 0}
						<div>
							<div class="mb-4 flex items-center justify-between">
								<h3 class="text-lg font-semibold text-white">Set Completion Progress <span class="text-sm font-normal text-gray-400">({sortedSets.length} sets)</span></h3>
								<span class="text-sm text-gray-400 italic">Click on a set to view its cards</span>
							</div>
							<div class="max-h-150 overflow-y-auto pr-2">
								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									{#each sortedSets as [setName, setData], i (setName)}
										{@const set = setsByName.get(setName)}
										<a
											href={`/collection/${encodeURIComponent(username)}?set=${encodeURIComponent(setName)}`}
											class="group block"
											title={`View ${isOwnProfile ? 'your' : `${username}'s`} cards from ${setName}`}
										>
											<div class="cursor-pointer rounded-lg border border-transparent bg-gray-800/60 p-4 transition-all duration-300 hover:border-gold-400 hover:bg-gray-700/40" in:fly={{ y: 20, duration: 300, delay: 50 + Math.min(i, 12) * 30 }}>
												<div class="mb-2 flex items-center justify-between">
													<div class="flex items-center gap-2">
														{#if !NO_IMAGES && set?.logo}
															<img alt={setName} class="h-6 w-auto" src={set.logo} />
														{/if}
														<h4 class="font-medium text-white transition-colors duration-200 group-hover:text-gold-400">{setName}</h4>
													</div>
													<div class="flex items-center gap-2">
														<span class="text-sm text-gold-400">{setData.percentage.toFixed(1)}%</span>
														<ChevronRight class="text-gray-500 transition-colors duration-200 group-hover:text-gold-400" size={16} />
													</div>
												</div>
												<div class="mb-4 h-2.5 w-full rounded-full bg-gray-700">
													<div class="h-2.5 rounded-full bg-gold-400" style="width: {setData.percentage}%"></div>
												</div>
												<div class="flex justify-between text-xs text-gray-400">
													<span>{setData.count} / {setData.total} cards</span>
													<span>Value: {formatCurrency(setData.collectedValue)}</span>
												</div>
											</div>
										</a>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<p class="text-gray-400">No set completion data available.</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</main>
