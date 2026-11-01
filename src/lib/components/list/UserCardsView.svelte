<script lang="ts">
	import BouncyLoader from '#components/BouncyLoader.svelte';
	import CardGrid from '#components/list/CardGrid.svelte';
	import GridHeading from '#components/list/GridHeading.svelte';
	import ImportModal from '#components/list/ImportModal.svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import PageNotice from '#components/PageNotice.svelte';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import UserX from '@lucide/svelte/icons/user-x';
	import type { Set } from '#lib/types.js';
	import { cardPath, formatCardNumber } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import { USER_CARDS_COPY, type UserCardsKind, type UserCardsPageData } from '#helpers/user-cards-page.ts';
	import { filters } from '#stores/filters.svelte.ts';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	interface Props {
		data: UserCardsPageData & { sets: Set[] };
		kind: UserCardsKind;
	}

	let { data, kind }: Props = $props();

	const copy = $derived(USER_CARDS_COPY[kind]);
	const isMissing = $derived(!data.targetProfile);
	const isPrivate = $derived(!!data.targetProfile && !data.isPublic && !data.isOwner);
	const summary = $derived(data.summary);
	const summaryText = $derived.by(() => {
		if (!summary) return '';
		const cards = `${summary.uniqueCards.toLocaleString('en-US')} ${kind === 'collection' ? 'unique ' : ''}card${summary.uniqueCards === 1 ? '' : 's'}`;
		const copies = kind === 'collection' && summary.copies !== summary.uniqueCards ? ` (${summary.copies.toLocaleString('en-US')} copies)` : '';
		return `${cards}${copies}, worth about ${formatEuros(summary.totalValue)} on Cardmarket.`;
	});

	let importing = $state(false);

	/**
	 * The grid is shared with /cards-list, so a visit starts from a clean slate and then takes the filters the URL names.
	 * This runs here as well as in CardGrid, which mounts inside the await block and so may run before or after it.
	 */
	onMount(() => {
		filters.reset();
		filters.applyFromUrl(page.url, data.sets);
	});
</script>

{#if isMissing}
	<PageNotice icon={UserX} showSearchUsers title="User Not Found">
		The user <strong class="text-gold-400">"{data.targetUsername}"</strong> could not be found. They may have changed their username or the account no longer exists.
	</PageNotice>
{:else if isPrivate}
	<PageNotice icon={ShieldAlert} showSearchUsers title={copy.privateHeading}>
		The {kind} for <strong class="text-gold-400">"{data.targetUsername}"</strong> is set to private. You cannot view {kind === 'collection' ? 'their cards' : 'it'} at this time.
	</PageNotice>
{:else}
	{#if summary}
		<GridHeading description={summaryText} title={data.heading} />
		{#if summary.topCards.length}
			<p class="shrink-0 px-4 pb-2 text-xs text-gray-400 max-md:text-center lg:px-10">
				Most valuable:
				{#each summary.topCards as card, index (card.cardCode)}
					{index ? ', ' : ''}<a class="text-gold-400 hover:underline" href={cardPath(card.language, card)}>{card.name} #{formatCardNumber(card.localId)}</a> <span class="tabular-nums">{formatEuros(card.price)}</span>
				{/each}
			</p>
		{/if}
	{/if}
	{#await data.streamed.payload}
		<div class="flex min-h-0 grow flex-col items-center justify-center py-8 text-center">
			<BouncyLoader size={40} />
			<p class="mt-3 text-xl text-white">Loading {kind}...</p>
		</div>
	{:then payload}
		{@const sets = [...data.sets, ...payload.sets]}
		<div class="flex min-h-0 grow flex-col pt-2">
			{#if data.isOwner}
				<div class="mb-4 flex justify-end">
					<button class="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gold-400 hover:text-gold-400" onclick={() => (importing = true)} type="button">
						<UploadIcon size={16} />
						Import from a file
					</button>
				</div>
				<ImportModal {kind} onClose={() => (importing = false)} open={importing} sets={data.sets} />
			{/if}

			<CardGrid
				artists={payload.artists}
				cards={payload.cards}
				pageTitle={summary ? null : data.heading}
				pokemons={payload.pokemons}
				rarities={payload.rarities}
				{sets}
				types={payload.types}
			/>

			{#if payload.cards.length === 0}
				<div class="mt-8 p-8 text-center">
					<p class="text-lg text-gray-400">{data.isOwner ? copy.emptyOwn : copy.emptyOther(data.targetUsername)}</p>
					{#if data.isOwner}
						<p class="mt-2 text-gray-500">{copy.emptyHint}</p>
					{/if}
				</div>
			{/if}
		</div>
	{:catch error}
		<PageNotice icon={ShieldAlert} iconClass="text-red-400" title={`Error Loading ${copy.label}`}>
			There was an error loading the {kind} data: {error.message}
		</PageNotice>
	{/await}
{/if}
