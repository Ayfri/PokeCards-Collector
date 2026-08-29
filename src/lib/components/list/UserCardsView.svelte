<script lang="ts">
	import BouncyLoader from '@components/BouncyLoader.svelte';
	import CardGrid from '@components/list/CardGrid.svelte';
	import ImportModal from '@components/list/ImportModal.svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import PageNotice from '@components/PageNotice.svelte';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import UserX from '@lucide/svelte/icons/user-x';
	import type { Set } from '$lib/types';
	import { USER_CARDS_COPY, type UserCardsKind, type UserCardsPageData } from '$helpers/user-cards-page';
	import { filters } from '$stores/filters.svelte';
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

	let importing = $state(false);

	// The grid is shared with /cards-list, so a visit starts from a clean slate, then takes the filters the URL names.
	// Re-applied here rather than left to CardGrid alone, which mounts inside the await block and so runs in either order.
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
	{#await data.streamed.payload}
		<div class="flex min-h-0 grow flex-col items-center justify-center py-8 text-center">
			<BouncyLoader size={40} />
			<p class="mt-3 text-xl text-white">Loading {kind}...</p>
		</div>
	{:then payload}
		<div class="flex min-h-0 grow flex-col py-8">
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
				disableLoader
				pageTitle={data.heading}
				pokemons={payload.pokemons}
				prices={payload.prices}
				rarities={payload.rarities}
				sets={data.sets}
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
		<PageNotice icon={ShieldAlert} iconClass="text-red-500" title={`Error Loading ${copy.label}`}>
			There was an error loading the {kind} data: {error.message}
		</PageNotice>
	{/await}
{/if}
