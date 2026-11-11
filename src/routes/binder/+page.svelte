<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '#components/PageHeader.svelte';
	import AuthModal from '#components/auth/AuthModal.svelte';
	import Button from '#components/filters/Button.svelte';
	import BinderBoard from '#components/binder/BinderBoard.svelte';
	import BinderStatus from '#components/binder/BinderStatus.svelte';
	import BinderTopBar from '#components/binder/BinderTopBar.svelte';
	import BinderHelp from '#components/binder/BinderHelp.svelte';
	import CardsPanel from '#components/binder/CardsPanel.svelte';
	import HelpCircleIcon from '@lucide/svelte/icons/circle-question-mark';
	import { BINDER_RECORD_KEY, isEditableTarget } from '#helpers/binder.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** The layout refreshes `collectionCodes` after an edit elsewhere, so the overlay follows. */
	$effect(() => {
		binderCards.ownedCodes = data.profile ? new Set(data.collectionCodes) : null;
	});

	/**
	 * Sign-in, sign-out and account switches call `refreshAll()` and never remount the page, so the lists follow the viewer from here, and an
	 * edit of the collection or wishlist elsewhere refreshes them. Both lists are compared through their length and ends, which an edit
	 * almost always moves, rather than hashing 10k codes. The first run always refreshes: an edit made on another page while this one was away left no trace here.
	 */
	let seenCodes = '';
	$effect(() => {
		const codes = [data.collectionCodes, data.wishlistCodes].map(list => `${list.length}:${list.at(0)}:${list.at(-1)}`).join('|');
		const edited = codes !== seenCodes;
		seenCodes = codes;
		binderCards.loadOwned(data.profile?.auth_id ?? null, edited);
	});

	let showAuth = $state(false);
	let showHelp = $state(false);

	/** Below `lg` the board and the cards panel do not fit side by side, so one shows at a time. */
	let mobileView = $state<'board' | 'cards'>('board');

	onMount(() => {
		binder.load();

		data.catalogue.then(({ cards, sets }) => {
			binderCards.catalogue = cards;
			binderCards.sets = sets;
		}).catch(error => console.error('Failed to load the card catalogue:', error));
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented || isEditableTarget(event.target) || !(event.ctrlKey || event.metaKey)) return;
		/** `Modal` moves focus into its dialog, so a key pressed behind an open modal lands inside it. */
		if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
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
</script>

<svelte:window onkeydown={handleKeydown} onstorage={event => event.key === BINDER_RECORD_KEY && binder.reload()} />

<BinderHelp onClose={toggleHelp} open={showHelp} />
<AuthModal onClose={() => (showAuth = false)} open={showAuth} />

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

	<div aria-label="Show the board or the cards" class="flex shrink-0 gap-1 rounded-lg bg-gray-800 p-1 text-sm lg:hidden" role="group">
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
			<BinderBoard onBrowse={() => (mobileView = 'cards')} />
			<BinderStatus loggedIn={Boolean(data.profile)} />
		</div>

		<div class={['min-h-0 lg:col-span-4', mobileView === 'board' && 'max-lg:hidden']}>
			<CardsPanel loggedIn={Boolean(data.profile)} onArm={() => (mobileView = 'board')} onSignIn={() => (showAuth = true)} />
		</div>
	</div>
</div>
