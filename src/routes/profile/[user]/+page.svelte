<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { timeAgo } from '$helpers/dates';
	import { compareRarities } from '$helpers/rarity';
	import { toggleProfileVisibility } from '$lib/services/profiles';
	import SetLogo from '@components/SetLogo.svelte';
	import Avatar from '@components/auth/Avatar.svelte';
	import CardImage from '@components/card/CardImage.svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Crown from '@lucide/svelte/icons/crown';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import Gem from '@lucide/svelte/icons/gem';
	import House from '@lucide/svelte/icons/house';
	import Layers from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import Settings from '@lucide/svelte/icons/settings';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { fly } from 'svelte/transition';
	import type { CollectionStats, Set } from '$lib/types';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const currencyFormatter = new Intl.NumberFormat('en-US', { currency: 'EUR', style: 'currency' });
	const numberFormatter = new Intl.NumberFormat('en-US');

	const SET_SORTS = {
		completion: { compare: (a: SetEntry, b: SetEntry) => b.percentage - a.percentage || b.count - a.count, label: 'Completion' },
		value: { compare: (a: SetEntry, b: SetEntry) => b.collectedValue - a.collectedValue, label: 'Value' },
		recent: { compare: (a: SetEntry, b: SetEntry) => (b.set?.releaseDate.getTime() ?? 0) - (a.set?.releaseDate.getTime() ?? 0), label: 'Newest' },
	} as const;

	type SetSort = keyof typeof SET_SORTS;
	type SetEntry = CollectionStats['set_completion'][string] & { name: string; set: Set | undefined };

	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let setSort = $state<SetSort>('completion');

	const { collectionStats, isOwnProfile, isPublic, sets, targetProfile, totalCards } = $derived(data);
	const username = $derived(targetProfile.username);
	const possessive = $derived(isOwnProfile ? 'your' : `${username}'s`);
	/** Tints the banner and the accents with the color picked in the settings, gold when none is set. */
	const accent = $derived(targetProfile.profile_color && /^#[0-9A-Fa-f]{6}$/.test(targetProfile.profile_color) ? targetProfile.profile_color : '#fbc54a');

	const setsByName = $derived(new Map(sets.map(set => [set.name, set])));
	const setEntries = $derived(Object.entries(collectionStats?.set_completion ?? {}).map(([name, completion]): SetEntry => ({ ...completion, name, set: setsByName.get(name) })));
	const sortedSets = $derived(setEntries.toSorted(SET_SORTS[setSort].compare));
	const completedSets = $derived(setEntries.filter(entry => entry.count === entry.total).length);
	/** Started sets summed card by card and euro by euro, so a 300-card set weighs more than a 17-card one, unlike the average. */
	const totalCompletion = $derived.by(() => {
		const sum = (key: 'collectedValue' | 'count' | 'total' | 'totalValue') => setEntries.reduce((total, entry) => total + entry[key], 0);
		const [count, total, collectedValue, totalValue] = [sum('count'), sum('total'), sum('collectedValue'), sum('totalValue')];
		const unique = collectionStats?.unique_cards ?? 0;
		return [
			{ detail: `${numberFormatter.format(count)} / ${numberFormatter.format(total)} cards`, label: 'Started sets', percentage: total ? (count / total) * 100 : 0 },
			{ detail: `${currencyFormatter.format(collectedValue)} / ${currencyFormatter.format(totalValue)}`, label: 'Value of the started sets', percentage: totalValue ? (collectedValue / totalValue) * 100 : 0 },
			{ detail: `${numberFormatter.format(unique)} / ${numberFormatter.format(totalCards)} cards`, label: 'Whole catalogue', percentage: totalCards ? (unique / totalCards) * 100 : 0 },
		];
	});
	const averageCompletion = $derived(setEntries.length ? setEntries.reduce((sum, entry) => sum + entry.percentage, 0) / setEntries.length : 0);

	/** Rarest first, the bar widths are relative to the most collected rarity. */
	const rarities = $derived(Object.entries(collectionStats?.cards_by_rarity ?? {}).sort(([a], [b]) => compareRarities(b, a)));
	const maxRarityCount = $derived(Math.max(1, ...rarities.map(([, count]) => count)));

	const tiles = $derived(collectionStats ? [
		{
			hint: `${numberFormatter.format(collectionStats.unique_cards)} unique, ${((collectionStats.unique_cards / Math.max(1, totalCards)) * 100).toFixed(2)}% of the catalogue`,
			icon: Layers,
			label: 'Cards owned',
			value: numberFormatter.format(collectionStats.total_instances),
		},
		{
			hint: collectionStats.total_instances ? `${currencyFormatter.format(collectionStats.total_value / collectionStats.total_instances)} per card on average` : 'Cardmarket trend prices',
			icon: Wallet,
			label: 'Collection value',
			value: currencyFormatter.format(collectionStats.total_value),
		},
		{
			hint: `${currencyFormatter.format(collectionStats.wishlist_total_value)} to complete it`,
			icon: ListTodo,
			label: 'Wishlist',
			value: numberFormatter.format(collectionStats.wishlist_count),
		},
		{
			hint: `${completedSets} complete, ${averageCompletion.toFixed(1)}% on average`,
			icon: LibraryIcon,
			label: 'Sets started',
			value: numberFormatter.format(setEntries.length),
		},
	] : []);

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
			successMessage = `Your profile is now ${newVisibility ? 'public' : 'private'}.`;
			setTimeout(() => successMessage = '', 3000);
		} catch (error) {
			errorMessage = `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}.`;
		} finally {
			isLoading = false;
		}
	}
</script>

<main class="container mx-auto flex flex-col gap-8 overflow-x-hidden px-4 pt-4 pb-12 text-white" style="--accent: {accent}">
	<section
		class="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
		in:fly|global={{ y: 40, duration: 400, delay: 100 }}
	>
		<div
			class="pointer-events-none absolute inset-0"
			style="background: radial-gradient(ellipse 60% 120% at 0% 0%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%), radial-gradient(ellipse 50% 90% at 100% 100%, color-mix(in oklab, var(--accent) 15%, transparent), transparent 70%)"
		></div>
		<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[18px_18px]"></div>

		<div class="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
			<div class="flex min-w-0 items-center gap-5">
				<div class="shrink-0 rounded-full p-1 shadow-lg" style="background: linear-gradient(135deg, var(--accent), transparent)">
					<Avatar profileColor={accent} size="size-20 text-4xl md:size-24 md:text-5xl" {username} />
				</div>
				<div class="min-w-0">
					<h1 class="truncate text-3xl font-bold md:text-4xl">{username}</h1>
					<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
						<span class="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1" title={`Joined on ${new Date(targetProfile.created_at).toLocaleDateString()}`}>
							<CalendarDays size={12} />
							Joined {timeAgo(targetProfile.created_at)}
						</span>
						<span
							class="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1"
							title={isPublic ? 'Anyone can browse this collection and wishlist' : 'Only the owner can see this collection and wishlist'}
						>
							{#if isPublic}<EyeIcon size={12} />{:else}<EyeOffIcon size={12} />{/if}
							{isPublic ? 'Public' : 'Private'}
						</span>
						{#if isOwnProfile && data.user?.email}
							<span class="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
								<Mail class="shrink-0" size={12} />
								<span class="truncate">{data.user.email}</span>
							</span>
						{/if}
					</div>
				</div>
			</div>

			{#if isPublic || isOwnProfile}
				<div class="flex flex-wrap gap-2 md:justify-end">
					<a
						class="flex items-center gap-2 rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-300"
						href={`/collection/${encodeURIComponent(username)}`}
						title={`Browse every card in ${possessive} collection`}
					>
						<BookOpen size={16} />
						Collection
					</a>
					<a
						class="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold transition-colors hover:border-gold-400 hover:text-gold-400"
						href={`/wishlist/${encodeURIComponent(username)}`}
						title={`Browse every card on ${possessive} wishlist`}
					>
						<ListTodo size={16} />
						Wishlist
					</a>
					{#if isOwnProfile}
						<button
							type="button"
							class="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold transition-colors hover:border-gold-400 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isLoading}
							onclick={handleToggleVisibility}
							title={isPublic ? 'Hide your collection and wishlist from other users' : 'Let other users browse your collection and wishlist'}
						>
							{#if isLoading}
								<LoaderCircle class="animate-spin" size={16} />
							{:else if isPublic}
								<EyeOffIcon size={16} />
							{:else}
								<EyeIcon size={16} />
							{/if}
							{isPublic ? 'Make private' : 'Make public'}
						</button>
						<a
							aria-label="Settings"
							class="flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 transition-colors hover:border-gold-400 hover:text-gold-400"
							href="/settings"
							title="Edit your profile color, email and password"
						>
							<Settings size={16} />
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	{#if successMessage}
		<p class="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300" in:fly={{ y: -20, duration: 300 }}>{successMessage}</p>
	{/if}
	{#if errorMessage}
		<p class="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300" in:fly={{ y: -20, duration: 300 }}>{errorMessage}</p>
	{/if}

	{#if !isPublic && !isOwnProfile}
		<section class="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gray-900/60 p-10 text-center" in:fly|global={{ y: 40, duration: 400, delay: 200 }}>
			<div class="rounded-full bg-white/5 p-4 text-gold-400"><Lock size={28} /></div>
			<h2 class="text-2xl font-bold">This collection is private</h2>
			<p class="max-w-md text-gray-400">{username} keeps their collection and wishlist to themselves.</p>
			<a class="mt-2 flex items-center gap-2 rounded-lg border border-gold-400 px-4 py-2 text-sm font-semibold text-gold-400 transition-colors hover:bg-gold-400 hover:text-black" href="/">
				<House size={16} />
				Return to Home
			</a>
		</section>
	{:else if collectionStats}
		<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each tiles as tile, i (tile.label)}
				<div
					class="group relative overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-gray-800 to-gray-900 p-5 transition-colors hover:border-gold-400/50"
					in:fly|global={{ y: 30, duration: 350, delay: 200 + i * 60 }}
					title={tile.hint}
				>
					<tile.icon class="absolute -right-3 -bottom-3 text-white/5 transition-colors group-hover:text-gold-400/10" size={88} />
					<p class="flex items-center gap-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
						<tile.icon class="text-gold-400" size={14} />
						{tile.label}
					</p>
					<p class="mt-2 text-3xl font-bold text-gold-400 tabular-nums">{tile.value}</p>
					<p class="mt-1 truncate text-xs text-gray-400">{tile.hint}</p>
				</div>
			{/each}
		</section>

		{#if collectionStats.top_cards.length || rarities.length}
			<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-3" in:fly|global={{ y: 30, duration: 400, delay: 400 }}>
				{#if collectionStats.top_cards.length}
					<section class="rounded-2xl border border-white/10 bg-gray-900/60 p-6 lg:col-span-2">
						<h2 class="mb-5 flex items-center gap-2 text-xl font-semibold"><Gem class="text-gold-400" size={20} /> Most valuable cards</h2>
						<div class="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
							{#each collectionStats.top_cards as { card, copies, price }, i (card.cardCode)}
								<a class="group flex flex-col gap-2" href={`/card/${card.cardCode}`} title={`${card.name}, ${card.setName} ${card.localId}`}>
									<div class="relative transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-1">
										<CardImage alt={card.name} {card} class="w-full rounded-lg shadow-lg" imageUrl={card.image} lowRes sizes="160px" types={card.types} />
										{#if i === 0}
											<span class="absolute -top-2 -left-2 rounded-full bg-gold-400 p-1 text-black shadow-md"><Crown size={14} /></span>
										{/if}
										{#if copies > 1}
											<span class="absolute top-1.5 right-1.5 rounded-md bg-black/75 px-1.5 text-xs font-semibold">x{copies}</span>
										{/if}
									</div>
									<div class="min-w-0 text-center">
										<p class="truncate text-xs text-gray-300 group-hover:text-white">{card.name}</p>
										<p class="text-sm font-semibold text-gold-400 tabular-nums">{currencyFormatter.format(price)}</p>
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				{#if rarities.length}
					<section class="rounded-2xl border border-white/10 bg-gray-900/60 p-6 {collectionStats.top_cards.length ? '' : 'lg:col-span-3'}">
						<h2 class="mb-5 flex items-center gap-2 text-xl font-semibold"><Trophy class="text-gold-400" size={20} /> Rarities</h2>
						<ul class="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
							{#each rarities as [rarity, count] (rarity)}
								<li>
									<div class="mb-1 flex justify-between gap-2 text-sm">
										<span class="truncate text-gray-300">{rarity}</span>
										<span class="text-gray-400 tabular-nums">{numberFormatter.format(count)}</span>
									</div>
									<div class="h-1.5 overflow-hidden rounded-full bg-white/5">
										<div class="h-full rounded-full bg-linear-to-r from-gold-600 to-gold-300" style="width: {(count / maxRarityCount) * 100}%"></div>
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
		{/if}

		<section class="rounded-2xl border border-white/10 bg-gray-900/60 p-6" in:fly|global={{ y: 30, duration: 400, delay: 500 }}>
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
				<h2 class="flex items-center gap-2 text-xl font-semibold">
					<LibraryIcon class="text-gold-400" size={20} />
					Set completion
					<span class="text-sm font-normal text-gray-400">{setEntries.length} sets</span>
				</h2>
				{#if setEntries.length > 1}
					<div class="flex rounded-lg border border-white/10 bg-black/20 p-0.5 text-sm" role="group" aria-label="Sort sets">
						{#each Object.entries(SET_SORTS) as [key, sort] (key)}
							<button
								type="button"
								aria-pressed={setSort === key}
								class="rounded-md px-3 py-1 transition-colors {setSort === key ? 'bg-gold-400 font-semibold text-black' : 'text-gray-300 hover:text-white'}"
								onclick={() => setSort = key as SetSort}
							>
								{sort.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if setEntries.length}
				<div class="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-gold-400/20 bg-gold-400/5 p-4 md:grid-cols-3">
					{#each totalCompletion as progress (progress.label)}
						<div class="min-w-0">
							<div class="flex items-baseline justify-between gap-2">
								<p class="truncate text-xs font-medium tracking-wider text-gray-400 uppercase">{progress.label}</p>
								<p class="text-xl font-bold text-gold-400 tabular-nums">{progress.percentage.toFixed(progress.percentage < 10 ? 2 : 1)}%</p>
							</div>
							<div class="my-1.5 h-2 overflow-hidden rounded-full bg-white/10">
								<div class="h-full rounded-full bg-linear-to-r from-gold-600 to-gold-300" style="width: {progress.percentage}%"></div>
							</div>
							<p class="truncate text-xs text-gray-400 tabular-nums">{progress.detail}</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if sortedSets.length}
				<div class="grid max-h-160 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
					{#each sortedSets as entry (entry.name)}
						{@const complete = entry.count === entry.total}
						<a
							class="group flex items-center gap-4 rounded-xl border p-3 transition-colors {complete ? 'border-gold-400/60 bg-gold-400/10' : 'border-white/5 bg-white/3 hover:border-gold-400/50'}"
							href={`/collection/${encodeURIComponent(username)}?set=${encodeURIComponent(entry.name)}`}
							title={`View ${possessive} cards from ${entry.name}`}
						>
							<div class="flex h-10 w-16 shrink-0 items-center justify-center">
								{#if entry.set}
									<SetLogo class="max-h-10 max-w-16 object-contain" set={entry.set}>
										{#snippet fallback()}<LibraryIcon class="text-gray-500" size={22} />{/snippet}
									</SetLogo>
								{/if}
							</div>
							<div class="min-w-0 grow">
								<div class="flex items-center justify-between gap-2">
									<p class="truncate text-sm font-medium group-hover:text-gold-400">{entry.name}</p>
									{#if complete}
										<Trophy class="shrink-0 text-gold-400" size={14} />
									{:else}
										<ChevronRight class="shrink-0 text-gray-500 group-hover:text-gold-400" size={14} />
									{/if}
								</div>
								<div class="my-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
									<div class="h-full rounded-full bg-gold-400" style="width: {entry.percentage}%"></div>
								</div>
								<div class="flex justify-between text-xs text-gray-400 tabular-nums">
									<span>{entry.count} / {entry.total} <span class="text-gray-500">({entry.percentage.toFixed(1)}%)</span></span>
									<span>{currencyFormatter.format(entry.collectedValue)}</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col items-center gap-2 py-8 text-center text-gray-400">
					<Layers class="text-gray-600" size={32} />
					<p>{isOwnProfile ? 'Your collection is empty.' : `${username} has not collected any card yet.`}</p>
					{#if isOwnProfile}
						<a class="text-sm text-gold-400 hover:underline" href="/cards-list">Browse the cards to start one</a>
					{/if}
				</div>
			{/if}
		</section>
	{/if}
</main>
