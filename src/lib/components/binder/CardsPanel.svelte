<script lang="ts">
	import Button from '#components/filters/Button.svelte';
	import Chip from '#components/filters/Chip.svelte';
	import SortControl from '#components/filters/SortControl.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import CardTile from '#components/binder/CardTile.svelte';
	import SetPicker from '#components/binder/SetPicker.svelte';
	import TrayAdd from '#components/binder/TrayAdd.svelte';
	import VirtualGrid from '#components/list/VirtualGrid.svelte';
	import { type BinderSort, type BinderTab, DRAG_SLOT_TYPE, dragLeft, MAX_FILL, readDrag, searchCards, sortBinderCards } from '#helpers/binder.ts';
	import { isCardCode } from '#helpers/card-utils.ts';
	import type { BinderCard } from '#lib/types.js';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import LockIcon from '@lucide/svelte/icons/lock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import UserRoundIcon from '@lucide/svelte/icons/user-round';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';

	interface Props {
		loggedIn: boolean;
		/** Called when a tile gets armed, so a phone can flip back to the board. */
		onArm?: () => void;
		onSignIn: () => void;
	}

	let { loggedIn, onArm, onSignIn }: Props = $props();

	const TABS: { icon: LucideIcon; id: BinderTab; label: string }[] = [
		{ icon: InboxIcon, id: 'tray', label: 'Tray' },
		{ icon: LayersIcon, id: 'sets', label: 'Sets' },
		{ icon: UserRoundIcon, id: 'mine', label: 'Mine' },
		{ icon: LayoutGridIcon, id: 'all', label: 'All cards' }
	];

	/** The ways out of an empty tray: each one opens the tab that fills it. */
	const SOURCES: { icon: LucideIcon; label: string; tab: BinderTab }[] = [
		{ icon: LayersIcon, label: 'Pick a set', tab: 'sets' },
		{ icon: UserRoundIcon, label: 'My cards', tab: 'mine' },
		{ icon: LayoutGridIcon, label: 'Browse all cards', tab: 'all' }
	];

	const SORT_OPTIONS: { label: string; value: BinderSort }[] = [
		{ label: 'Default order', value: 'natural' },
		{ label: 'Card number', value: 'number' },
		{ label: 'Set', value: 'set' },
		{ label: 'Name', value: 'name' },
		{ label: 'Price', value: 'price' }
	];

	/** The tiles are sized from the width of the list so the columns divide it exactly: a fixed width left margins wherever the width was not a multiple of it. */
	const GAP = 8;
	const MIN_TILE = 88;

	let listWidth = $state(0);
	const columns = $derived(Math.max(1, Math.floor((listWidth + GAP) / (MIN_TILE + GAP))));
	const tileWidth = $derived(Math.max(MIN_TILE, Math.floor((listWidth - GAP * (columns - 1)) / columns)));
	const tileHeight = $derived(Math.round((tileWidth * 3.5) / 2.5));

	let term = $state('');
	let dropActive = $state(false);
	let openSet = $state<string | null>(null);

	/** How the list is displayed, kept across visits since the binder is built over several sessions. */
	const view = $derived(binder.view);
	const tab = $derived(view.tab);
	const pickingSet = $derived(tab === 'sets' && openSet === null);
	const set = $derived(openSet === null ? undefined : binderCards.setsById.get(openSet));

	const unresolved = (key: string): BinderCard => ({ cardCode: key, image: '', localId: '', name: key, price: null, rarity: '', setId: '', setName: '', types: '' });

	/** The viewer's lists, collection first, each card once: the two lists can hold the same card. */
	const mine = $derived.by(() => {
		const { collection = [], wishlist = [] } = binderCards.owned ?? {};
		return [...new Map([...(view.mine.collection ? collection : []), ...(view.mine.wishlist ? wishlist : [])].map(card => [card.cardCode, card])).values()];
	});

	/** The tray holds each key once (`parseRecord` and `addToTray` see to it): a duplicate would make the virtual grid throw. */
	const source = $derived.by((): readonly BinderCard[] => {
		if (tab === 'all') return binderCards.byRelease;
		if (tab === 'mine') return mine;
		if (tab === 'sets') return openSet === null ? [] : binderCards.bySet.get(openSet) ?? [];
		return binder.tray.map(key => binderCards.get(key) ?? unresolved(key));
	});
	const sorted = $derived(sortBinderCards(source, view.sortBy, view.sortOrder));

	/** The list as displayed, so Fill pours cards in the order the user sorted them. */
	const shown = $derived.by(() => {
		const found = searchCards(sorted, term);
		return view.hidePlaced ? found.filter(card => !binder.placed.has(card.cardCode)) : found;
	});

	/** `shown` holds each key once, so this is what `binder.fill` will place. */
	const fillable = $derived(shown.filter(card => !binder.placed.has(card.cardCode)).length);
	const canFill = $derived(binderCards.ready && fillable > 0 && fillable <= MAX_FILL);

	/** Why the list is empty, and the action that fixes it when there is one. */
	const nothing = $derived.by((): { action?: 'retry' | 'signIn' | 'sources'; icon: LucideIcon; spin?: boolean; text: string } => {
		if (tab === 'mine' && !loggedIn) return { action: 'signIn', icon: LockIcon, text: 'Sign in to lay out your collection and wishlist.' };
		if (tab === 'mine' && binderCards.ownedStatus === 'error') return { action: 'retry', icon: RefreshCwIcon, text: 'Your cards could not be loaded.' };
		if (tab === 'mine' && binderCards.ownedStatus !== 'ready') return { icon: LoaderCircleIcon, spin: true, text: 'Loading your cards...' };
		if (source.length) return { icon: SearchXIcon, text: 'No card matches the search or the filter.' };
		if (tab === 'tray') return { action: 'sources', icon: InboxIcon, text: 'Your tray is empty. Fill it from one of these:' };
		if (tab === 'mine') return { icon: UserRoundIcon, text: 'Nothing in your collection or wishlist yet.' };
		if (!binderCards.ready) return { icon: LoaderCircleIcon, spin: true, text: 'Loading the catalogue...' };
		return { icon: InboxIcon, text: 'No cards to show.' };
	});

	function setSort(value: string) {
		binder.setView({ sortBy: value as BinderSort });
	}

	function toggleMine(list: 'collection' | 'wishlist') {
		const other = list === 'collection' ? 'wishlist' : 'collection';
		if (view.mine[list] && !view.mine[other]) return;
		binder.setView({ mine: { ...view.mine, [list]: !view.mine[list] } });
	}

	function handleTabKeys(event: KeyboardEvent) {
		const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		event.preventDefault();
		const next = TABS[(TABS.findIndex(item => item.id === tab) + step + TABS.length) % TABS.length].id;
		binder.setView({ tab: next });
		document.getElementById(`cards-tab-${next}`)?.focus();
	}

	/** Only a card dragged out of a slot lights the panel: a tile of the list dragged over it, or a page, has nothing to send back. */
	function handleDragOver(event: DragEvent) {
		if (!event.dataTransfer?.types.includes(DRAG_SLOT_TYPE)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		dropActive = true;
	}

	/** Dropping a binder card back here pulls it out of its slot. */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dropActive = false;
		const payload = readDrag(event);
		if (payload?.kind === 'slot') binder.remove({ page: payload.page, position: payload.position });
	}
</script>

<div
	aria-label="Cards"
	class={['flex h-full min-h-0 flex-col gap-3 rounded-2xl bg-gray-800 p-3 transition-colors', dropActive && 'ring-2 ring-gold-400']}
	ondragleave={event => { if (dragLeft(event)) dropActive = false; }}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="region"
>
	<!-- Below 24rem the tab strip shows the label of the selected tab only, which keeps four tabs in the 334 px a 390 px phone leaves it. -->
	<div aria-label="Card sources" class="@container flex shrink-0 gap-1 rounded-lg bg-gray-900/60 p-1 text-sm" role="tablist">
		{#each TABS as item (item.id)}
			<button
				aria-controls="cards-panel"
				aria-selected={tab === item.id}
				class={[
					'focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 whitespace-nowrap transition-colors',
					tab === item.id ? 'bg-gold-400 font-semibold text-black' : 'text-gray-300 hover:bg-gray-700/60 hover:text-gold-400'
				]}
				id="cards-tab-{item.id}"
				onclick={() => binder.setView({ tab: item.id })}
				onkeydown={handleTabKeys}
				role="tab"
				tabindex={tab === item.id ? 0 : -1}
				type="button"
			>
				<item.icon class="shrink-0" size={14} />
				<span class={[tab !== item.id && '@max-sm:sr-only']}>{item.label}</span>
				{#if item.id === 'tray' && binder.trayLeft}
					<span class={['rounded-full px-1.5 text-xs tabular-nums', tab === item.id ? 'bg-black/20' : 'bg-gray-700']} title="Cards in the tray not placed yet">{binder.trayLeft}</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if tab === 'tray'}
		<TrayAdd />
	{:else if tab === 'mine' && loggedIn}
		<div class="flex shrink-0 gap-2">
			<Chip isActive={view.mine.collection} onClick={() => toggleMine('collection')}>
				<LibraryIcon size={12} /> Collection{#if binderCards.owned} ({binderCards.owned.collection.length}){/if}
			</Chip>
			<Chip isActive={view.mine.wishlist} onClick={() => toggleMine('wishlist')}>
				<HeartIcon size={12} /> Wishlist{#if binderCards.owned} ({binderCards.owned.wishlist.length}){/if}
			</Chip>
		</div>
	{:else if tab === 'sets' && set}
		<div class="flex shrink-0 items-center gap-2 text-sm">
			<Button class="px-2" onClick={() => (openSet = null)} title="Back to the list of sets"><ArrowLeftIcon size={16} /></Button>
			{#if set.symbol}<img alt="" class="size-6 shrink-0 object-contain" src={set.symbol} />{/if}
			<span class="min-w-0 flex-1 truncate font-semibold text-gray-100">{set.name}</span>
			<span class="shrink-0 text-xs text-gray-400 tabular-nums">{set.total} cards</span>
		</div>
	{/if}

	<div class="flex shrink-0 flex-wrap items-end gap-2">
		<TextInput
			bind:value={term}
			clearable
			hint={pickingSet || !source.length ? undefined : `${shown.length} of ${source.length}`}
			id="cards-search"
			label="Search"
			placeholder={pickingSet ? 'Set name' : 'Name, set or code'}
		/>
		{#if !pickingSet}
			<SortControl
				active={view.sortBy !== 'natural'}
				bind:sortDirection={() => view.sortOrder, sortOrder => binder.setView({ sortOrder })}
				bind:sortValue={() => view.sortBy, setSort}
				options={SORT_OPTIONS}
			/>
			<Button class="px-2" isActive={view.hidePlaced} onClick={() => binder.setView({ hidePlaced: !view.hidePlaced })} title={view.hidePlaced ? 'Showing only the cards left to place' : 'Hide the cards already placed'}>
				<EyeOffIcon size={16} />
			</Button>
		{/if}
	</div>

	<div aria-labelledby="cards-tab-{tab}" bind:clientWidth={listWidth} class="relative flex min-h-0 flex-1 flex-col" id="cards-panel" role="tabpanel">
		{#if pickingSet}
			<SetPicker onPick={setId => { openSet = setId; term = ''; }} {term} />
		{:else}
			{#key tab}
				<VirtualGrid forcedItemsPerRow={columns} gapX={GAP} gapY={GAP} itemHeight={tileHeight} items={shown} itemWidth={tileWidth} pageScroll={false}>
					{#snippet children({ item })}
						<CardTile card={item} inTray={tab === 'tray'} missing={isCardCode(item.cardCode) && !binderCards.byCode.has(item.cardCode)} {onArm} />
					{/snippet}
					{#snippet empty()}
						<div class="flex flex-col items-center gap-3 p-4 text-center text-sm text-gray-400">
							<nothing.icon class={['size-10 text-gray-600', nothing.spin && 'motion-safe:animate-spin']} />
							<p>{nothing.text}</p>
							{#if nothing.action === 'signIn'}
								<Button onClick={onSignIn}>Sign in</Button>
							{:else if nothing.action === 'retry'}
								<Button onClick={() => binderCards.loadOwned()}>Try again</Button>
							{:else if nothing.action === 'sources'}
								<div class="grid w-full grid-cols-3 gap-2">
									{#each SOURCES as { icon: Icon, label, tab: target } (target)}
										<button
											class="focus-ring flex flex-col items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/60 px-1 py-3 text-xs text-gray-200 transition-all hover:border-gold-400 hover:text-gold-400 motion-safe:hover:-translate-y-0.5"
											onclick={() => binder.setView({ tab: target })}
											type="button"
										>
											<Icon size={20} />
											{label}
										</button>
									{/each}
								</div>
								<p class="text-xs">Or use Add in the header search.</p>
							{/if}
						</div>
					{/snippet}
				</VirtualGrid>
			{/key}
		{/if}
		{#if dropActive}
			<div class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold-400 bg-gray-800/90 text-sm font-semibold text-gold-400 motion-safe:animate-pop">
				<InboxIcon size={32} />
				Drop to send back to the tray
			</div>
		{/if}
	</div>

	{#if !pickingSet}
		<button
			class="btn-gold flex shrink-0 items-center justify-center gap-2 text-sm"
			disabled={!canFill}
			onclick={() => binder.fill(shown.map(card => card.cardCode))}
			title={fillable > MAX_FILL ? `Narrow the list to ${MAX_FILL} cards or fewer to fill` : 'Pour the list as shown into the empty slots'}
			type="button"
		>
			<WandSparklesIcon size={16} /> Fill empty slots ({fillable})
		</button>
	{/if}
</div>
