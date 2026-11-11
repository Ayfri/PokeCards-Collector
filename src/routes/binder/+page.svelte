<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '#components/PageHeader.svelte';
	import Button from '#components/filters/Button.svelte';
	import Checkbox from '#components/filters/Checkbox.svelte';
	import Select from '#components/filters/Select.svelte';
	import TextArea from '#components/filters/TextArea.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import BinderBoard from '#components/binder/BinderBoard.svelte';
	import BinderStatus from '#components/binder/BinderStatus.svelte';
	import BinderStorage from '#components/binder/BinderStorage.svelte';
	import BinderTopBar from '#components/binder/BinderTopBar.svelte';
	import BinderHelp from '#components/binder/BinderHelp.svelte';
	import Modal from '#components/ui/Modal.svelte';
	import HelpCircleIcon from '@lucide/svelte/icons/circle-question-mark';
	import { BINDER_RECORD_KEY, isEditableTarget } from '#helpers/binder.ts';
	import { setCardCount } from '#helpers/card-utils.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	const loggedIn = $derived(Boolean(data.profile));

	let showHelp = $state(false);
	let showSetModal = $state(false);
	let showUrlModal = $state(false);
	let showClearStorageModal = $state(false);
	let showMyCardsModal = $state(false);
	let selectedSet = $state('');
	let cardUrl = $state('');
	let multipleCardUrls = $state('');
	let includeCollection = $state(true);
	let includeWishlist = $state(true);

	/** Below `lg` the board and the cards panel do not fit side by side, so one shows at a time. */
	let mobileView = $state<'board' | 'cards'>('board');

	const urlCandidates = $derived([cardUrl, ...multipleCardUrls.split(/[\n;]/)]
		.map(url => url.trim().replace(/\.$/, ''))
		.filter(url => url.startsWith('http')));

	onMount(() => {
		binder.load();

		data.catalogue.then(cards => {
			binderCards.catalogue = cards;
		}).catch(error => console.error('Failed to load the card catalogue:', error));
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented || isEditableTarget(event.target)) return;
		if (event.key === 'Escape') binder.armed = null;
		if (!(event.ctrlKey || event.metaKey)) return;
		const key = event.key.toLowerCase();
		if (key === 'z') {
			event.preventDefault();
			if (event.shiftKey) binder.redo();
			else binder.undo();
		} else if (key === 'y' && event.ctrlKey) {
			event.preventDefault();
			binder.redo();
		}
	}

	function toggleHelp() { showHelp = !showHelp; }
	function toggleSetModal() {
		showSetModal = !showSetModal;
		if (!showSetModal) selectedSet = '';
	}
	function toggleUrlModal() {
		showUrlModal = !showUrlModal;
		if (!showUrlModal) { cardUrl = ''; multipleCardUrls = ''; }
	}
	function toggleMyCardsModal() { showMyCardsModal = !showMyCardsModal; }
	function toggleClearStorageModal() { showClearStorageModal = !showClearStorageModal; }

	function clearAllStoredCards() {
		binder.clearTray();
		toggleClearStorageModal();
	}

	function addSetToStorage() {
		if (!selectedSet) return;
		binder.addToTray(binderCards.catalogue.filter(card => card.setName === selectedSet).map(card => card.cardCode));
		toggleSetModal();
	}

	function addMyCardsToStorage() {
		const codes: string[] = [];
		if (includeCollection) codes.push(...new Set(data.collectionCodes));
		if (includeWishlist) codes.push(...new Set(data.wishlistCodes));
		binder.addToTray(codes);
		toggleMyCardsModal();
	}

	function addCardFromUrl() {
		binder.addToTray(urlCandidates);
		toggleUrlModal();
	}
</script>

<svelte:window onkeydown={handleKeydown} onstorage={event => event.key === BINDER_RECORD_KEY && binder.reload()} />

<BinderHelp onClose={toggleHelp} open={showHelp} />

<!-- `lg:pt-8` puts the header where it sits on the other pages: a full-viewport `main` keeps `pt-24` at `lg`, which the header's `lg:-mt-8` would otherwise eat into. -->
<div class="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 md:px-6 lg:pt-8">
	<PageHeader class="shrink-0" hideLedeOnPhone lede="Lay out binder pages with your cards, a set or any card by URL, then export them as an image." title="Binder Builder">
		{#snippet extras()}
			<Button class="p-1.5" onClick={toggleHelp} title="How the Binder Builder works">
				<HelpCircleIcon size={20} />
			</Button>
		{/snippet}
		{#snippet controls()}
			<BinderTopBar username={data.profile?.username} />
		{/snippet}
	</PageHeader>

	<div class="flex shrink-0 gap-1 rounded-lg bg-gray-800 p-1 text-sm lg:hidden" role="group">
		<button
			aria-pressed={mobileView === 'board'}
			class={['focus-ring flex-1 rounded-md px-3 py-1.5 transition-colors', mobileView === 'board' ? 'bg-gold-400 font-semibold text-black' : 'text-gray-300']}
			onclick={() => (mobileView = 'board')}
			type="button"
		>
			Board
		</button>
		<button
			aria-pressed={mobileView === 'cards'}
			class={['focus-ring flex-1 rounded-md px-3 py-1.5 transition-colors', mobileView === 'cards' ? 'bg-gold-400 font-semibold text-black' : 'text-gray-300']}
			onclick={() => (mobileView = 'cards')}
			type="button"
		>
			Cards ({binder.trayLeft})
		</button>
	</div>

	<div class="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-12">
		<div class={['flex min-h-0 flex-col gap-2 lg:col-span-8', mobileView === 'cards' && 'max-lg:hidden']}>
			<BinderBoard />
			<BinderStatus />
		</div>

		<div class={['min-h-0 lg:col-span-4', mobileView === 'board' && 'max-lg:hidden']}>
			<BinderStorage
				onAddSet={toggleSetModal}
				onAddUrl={toggleUrlModal}
				onArm={() => (mobileView = 'board')}
				onClear={toggleClearStorageModal}
				onMyCards={toggleMyCardsModal}
				{sets}
			/>
		</div>
	</div>
</div>

<Modal bind:open={showSetModal} onClose={toggleSetModal} title="Add complete set">
	<p class="mb-4 text-sm text-gray-300">Choose a set to send all of its cards to the storage.</p>

	<div class="mb-4">
		<Select
			bind:value={selectedSet}
			id="set-select"
			label="Choose a set:"
			options={data.sets
				.slice()
				.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
				.map(set => ({
					label: `${set.name} (${new Date(set.releaseDate).toLocaleDateString()}) - ${setCardCount(set)} cards`,
					value: set.name
				}))}
			placeholder="-- Select a set --"
		/>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleSetModal}>Cancel</Button>
		<button class="btn-gold text-sm" disabled={!selectedSet || !binderCards.ready} onclick={addSetToStorage} type="button">{binderCards.ready ? 'Add set' : 'Loading cards...'}</button>
	{/snippet}
</Modal>

<Modal bind:open={showMyCardsModal} onClose={toggleMyCardsModal} title="Add my cards">
	<p class="mb-4 text-sm text-gray-300">Choose which cards to send to the storage.</p>

	<div class="mb-4 flex flex-col gap-4">
		<Checkbox bind:checked={includeCollection} disabled={!loggedIn} id="include-collection" label="Include my collection" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if loggedIn}{data.collectionCodes.length} cards in your collection{:else}You need to be logged in to access your collection{/if}
		</p>

		<Checkbox bind:checked={includeWishlist} disabled={!loggedIn} id="include-wishlist" label="Include my wishlist" />
		<p class="-mt-3 ml-6 text-xs text-gray-400">
			{#if loggedIn}{data.wishlistCodes.length} cards in your wishlist{:else}You need to be logged in to access your wishlist{/if}
		</p>
	</div>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleMyCardsModal}>Cancel</Button>
		<button
			class="btn-gold text-sm"
			disabled={!loggedIn || (!includeCollection && !includeWishlist)}
			onclick={addMyCardsToStorage}
			type="button"
		>
			Add to storage
		</button>
	{/snippet}
</Modal>

<Modal bind:open={showUrlModal} onClose={toggleUrlModal} title="Add card from URL">
	<p class="mb-4 text-sm text-gray-300">
		Paste image URLs to add them to the storage. URLs must start with 'http', and several can be separated by line breaks or semicolons.
	</p>
	<div class="mb-4">
		<TextInput bind:value={cardUrl} id="cardUrl" label="Single card image URL" placeholder="https://assets.tcgdex.net/..." type="url" />
	</div>
	<div class="mb-4">
		<TextArea
			bind:value={multipleCardUrls}
			class="max-h-80 overflow-y-auto"
			id="multipleCardUrls"
			label="Or multiple URLs (one per line)"
			placeholder={'https://example.com/card1.png\nhttps://example.com/card2.png'}
			rows={4}
		/>
	</div>
	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleUrlModal}>Cancel</Button>
		<button class="btn-gold text-sm" disabled={!urlCandidates.length} onclick={addCardFromUrl} type="button">Add card(s)</button>
	{/snippet}
</Modal>

<Modal bind:open={showClearStorageModal} onClose={toggleClearStorageModal} title="Clear Storage">
	<p class="mb-4 text-gray-300">Are you sure you want to remove all stored cards? This cannot be undone.</p>

	{#snippet footer()}
		<Button class="border border-gray-600 px-4 py-2 text-sm" onClick={toggleClearStorageModal}>Cancel</Button>
		<button class="btn-gold text-sm" onclick={clearAllStoredCards} type="button">Clear all cards</button>
	{/snippet}
</Modal>
