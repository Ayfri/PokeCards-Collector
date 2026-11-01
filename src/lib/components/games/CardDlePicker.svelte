<script lang="ts">
	import { tick } from 'svelte';
	import BouncyLoader from '#components/BouncyLoader.svelte';
	import CardImage from '#components/card/CardImage.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import SortControl from '#components/filters/SortControl.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import { hasEasyFilters, matchesEasyFilters, withoutPrice, type EasyFilters } from '#helpers/card-dle.ts';
	import { formatEuros } from '#helpers/format.ts';
	import type { CardDleSuggestion, Set as CardSet } from '#lib/types.js';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import SearchIcon from '@lucide/svelte/icons/search';

	interface Props {
		/** A guess is being judged: picks are ignored, the input keeps its focus. */
		disabled: boolean;
		/** The list only holds the cards that fit `filters`. */
		easy: boolean;
		/** Guessed card codes plus the pending one. */
		excluded: ReadonlySet<string>;
		/** What the board has proven so far. */
		filters: EasyFilters;
		/** The switch is stored on the device, so it draws only after mount. */
		hydrated: boolean;
		onEasyChange: (easy: boolean) => void;
		onPick: (card: CardDleSuggestion) => void;
		setsById: Map<string, CardSet>;
		status: 'failed' | 'loading' | 'ready';
		suggestions: CardDleSuggestion[];
	}

	let { disabled, easy, excluded, filters, hydrated, onEasyChange, onPick, setsById, status, suggestions }: Props = $props();

	const LIST_LIMIT = 50;
	const CHIP = 'flex items-center gap-1 rounded-full border border-gold-500/40 bg-gray-800 px-2 py-0.5 text-gray-200';
	const PRICE_IGNORED = 'Prices moved since the list loaded, the price hint is ignored';
	const SORT_OPTIONS = [
		{ label: 'Name', value: 'name' },
		{ label: 'Price', value: 'price' },
		{ label: 'Set', value: 'set' }
	];

	const listId = $props.id();

	let query = $state('');
	let open = $state(false);
	let active = $state(0);
	let sortValue = $state('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	/** Lowercased once when the list arrives, so a keystroke only runs `includes` over ~10k cards. */
	const searchable = $derived(suggestions.map(card => ({ card, name: card.name.toLowerCase(), pokemonName: card.pokemonName.toLowerCase() })));
	const term = $derived(query.trim().toLowerCase());
	/** With a hint proven and the switch on, the empty query lists the whole remaining pool instead of staying closed. */
	const narrowed = $derived(easy && hasEasyFilters(filters));
	const available = $derived(searchable.filter(entry => !excluded.has(entry.card.cardCode)));
	const fitting = $derived(narrowed ? available.filter(entry => matchesEasyFilters(entry.card, filters)) : available);
	/** The candidate prices come from the session-cached list and the bounds from live guesses: when a moved price empties the pool, the price hints are dropped. */
	const candidates = $derived.by(() => {
		if (!narrowed || fitting.length > 0) return fitting;

		const withoutPrices = withoutPrice(filters);
		return available.filter(entry => matchesEasyFilters(entry.card, withoutPrices));
	});
	const priceIgnored = $derived(candidates.length > 0 && fitting.length === 0);

	/** Every match is sorted, not only the 50 shown, so the order is the real one; ties keep the server's alphabetical order. */
	const matches = $derived.by(() => {
		if (!term && !narrowed) return [];

		const sign = sortDirection === 'asc' ? 1 : -1;
		const compare = (a: CardDleSuggestion, b: CardDleSuggestion) =>
			sortValue === 'price' ? a.price - b.price : sortValue === 'set' ? a.setName.localeCompare(b.setName) : a.name.localeCompare(b.name);

		return candidates
			.filter(entry => entry.pokemonName.includes(term) || entry.name.includes(term))
			.map(entry => entry.card)
			.toSorted((a, b) => sign * compare(a, b));
	});
	const visible = $derived(matches.slice(0, LIST_LIMIT));
	/** The highlighted row, kept inside the list when the matches shrink under it. */
	const current = $derived(visible.length > 0 ? Math.min(active, visible.length - 1) : -1);
	const showList = $derived(open && (term !== '' || narrowed));
	const pinnedSet = $derived(filters.setName === null ? undefined : [...setsById.values()].find(set => set.name === filters.setName));
	const pinnedTypes = $derived(filters.types?.split(',').filter(Boolean) ?? []);

	function pick(card: CardDleSuggestion) {
		if (disabled) return;

		onPick(card);
		query = '';
		open = false;
	}

	async function move(step: number) {
		if (visible.length === 0) return;

		active = (current + step + visible.length) % visible.length;
		await tick();
		document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const closed = !showList;
			open = true;

			if (closed && event.key === 'ArrowDown') active = 0;
			else move(event.key === 'ArrowDown' ? 1 : -1);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (showList && current >= 0) pick(visible[current]);
		} else if (event.key === 'Escape') {
			if (showList) open = false;
			else query = '';
		}
	}

	function handleFocusOut(event: FocusEvent & { currentTarget: HTMLDivElement }) {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) open = false;
	}

	/** Keeps the focus in the input while a row or the sort buttons are pressed; the sort select needs the default to open. */
	function keepInputFocus(event: MouseEvent) {
		if (!(event.target as Element).closest('select')) event.preventDefault();
	}
</script>

<div class="mx-auto flex w-full max-w-xl flex-col gap-2">
	<div class="relative" onfocusout={handleFocusOut}>
		<div class="flex h-12 items-center gap-2 rounded-lg border border-gold-500/60 bg-gray-900 px-3 focus-within:border-gold-300">
			<SearchIcon class="shrink-0 text-gold-400" size={18} />
			<label class="sr-only" for="{listId}-input">Search a Pokémon or card name</label>
			<input
				id="{listId}-input"
				class="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-gray-500"
				aria-activedescendant={showList && current >= 0 ? `${listId}-${current}` : undefined}
				aria-autocomplete="list"
				aria-busy={disabled}
				aria-controls={listId}
				aria-expanded={showList && visible.length > 0}
				autocomplete="off"
				bind:value={query}
				onclick={() => (open = true)}
				onfocus={() => (open = true)}
				oninput={() => {
					active = 0;
					open = true;
				}}
				onkeydown={handleKeydown}
				placeholder="Pikachu, Charizard..."
				role="combobox"
				spellcheck="false"
				type="text"
			/>
		</div>

		{#if showList}
			<div class="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl" onmousedown={keepInputFocus} role="presentation">
				{#if status === 'loading'}
					<p class="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400"><BouncyLoader size={20} speed={0.8} /> Loading cards...</p>
				{:else if status === 'failed'}
					<p class="px-3 py-6 text-center text-sm text-red-400">Could not load the cards, reload the page</p>
				{:else if matches.length === 0}
					<p class="px-3 py-6 text-center text-sm text-gray-400">{term ? `No card matches "${query.trim()}"` : 'No card fits the hints so far'}</p>
				{:else}
					<div class="flex items-end justify-between gap-3 border-b border-gray-700 px-3 py-2 text-xs text-gray-400">
						<span>{matches.length} cards</span>
						<div class="w-48"><SortControl bind:sortDirection bind:sortValue options={SORT_OPTIONS} /></div>
					</div>
					<ul id={listId} class="max-h-[min(32rem,60dvh)] overflow-y-auto" role="listbox">
						{#each visible as suggestion, index (suggestion.cardCode)}
							{@const set = setsById.get(suggestion.setId)}
							<!-- The options are driven from the combobox input (arrows and Enter), so they take no key handler of their own. -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<li
								id="{listId}-{index}"
								class={['flex items-center gap-3 px-3 py-2', disabled ? 'cursor-wait' : 'cursor-pointer', index === current && 'bg-gray-700']}
								aria-selected={index === current}
								onclick={() => pick(suggestion)}
								onpointerenter={() => (active = index)}
								role="option"
							>
								<CardImage card={suggestion.plate} class="h-20 w-auto rounded-sm" imageUrl={suggestion.image} alt={suggestion.name} lazy lowRes />
								<div class="min-w-0 flex-1">
									<p class="truncate text-base font-semibold text-white">{suggestion.name}</p>
									<p class="flex items-center gap-1.5 text-sm text-gray-400">
										{#if set}
											<SetLogo class="h-4 w-auto max-w-12 shrink-0 object-contain" {set} />
										{/if}
										<span class="truncate">{suggestion.setName}</span>
									</p>
								</div>
								<span class="text-base text-white tabular-nums" title="Cardmarket value of this card">{formatEuros(suggestion.price)}</span>
							</li>
						{/each}
					</ul>
					{#if matches.length > LIST_LIMIT}
						<p class="border-t border-gray-700 px-3 py-2 text-center text-xs text-gray-400">Showing {LIST_LIMIT} of {matches.length}, keep typing</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	{#if hydrated}
		<div class="flex flex-wrap items-center gap-1.5 text-xs">
			<button
				class="focus-ring flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 font-semibold text-gray-200 transition-colors hover:bg-gray-700"
				aria-checked={easy}
				onclick={() => onEasyChange(!easy)}
				role="switch"
				title="Narrows the list to the cards that fit every hint found so far: the Pokémon, artist, set, rarity, supertype, type and price bounds"
				type="button"
			>
				<span class={['relative h-4 w-7 rounded-full transition-colors', easy ? 'bg-gold-400' : 'bg-gray-600']}>
					<span class={['absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform', easy && 'translate-x-3']}></span>
				</span>
				Easy mode
			</button>

			{#if easy}
				{#if filters.name !== null}
					<span class={CHIP} title="The mystery card is named {filters.name}"><PawPrintIcon size={12} /> {filters.name}</span>
				{/if}
				{#if filters.artist !== null}
					<span class={CHIP} title="The mystery card is illustrated by {filters.artist}"><PaintbrushIcon size={12} /> {filters.artist}</span>
				{/if}
				{#if filters.setName !== null}
					<span class={CHIP} title="The mystery card is from {filters.setName}">
						{#if pinnedSet}
							<SetLogo class="h-4 w-auto max-w-10 shrink-0 object-contain" set={pinnedSet} />
						{/if}
						{filters.setName}
					</span>
				{/if}
				{#if filters.rarity !== null}
					<span class={CHIP} title="The mystery card has this rarity"><RaritySymbol decorative rarity={filters.rarity} /> {filters.rarity}</span>
				{/if}
				{#if filters.supertype !== null}
					<span class={CHIP} title="The mystery card is a {filters.supertype} card"><LayersIcon size={12} /> {filters.supertype}</span>
				{/if}
				{#if filters.types !== null}
					<span class={CHIP} title="The mystery card has these types">
						{#each pinnedTypes as type (type)}
							<TypeSymbol decorative {type} />{type.trim()}
						{:else}
							No type
						{/each}
					</span>
				{/if}
				{#if filters.price !== null}
					<span class={[CHIP, priceIgnored && 'opacity-50']} title={priceIgnored ? PRICE_IGNORED : 'The mystery card costs exactly this'}>{formatEuros(filters.price)}</span>
				{/if}
				{#if filters.priceAbove !== null}
					<span class={[CHIP, priceIgnored && 'opacity-50']} title={priceIgnored ? PRICE_IGNORED : 'The mystery card costs more than this'}>&gt; {formatEuros(filters.priceAbove)}</span>
				{/if}
				{#if filters.priceBelow !== null}
					<span class={[CHIP, priceIgnored && 'opacity-50']} title={priceIgnored ? PRICE_IGNORED : 'The mystery card costs less than this'}>&lt; {formatEuros(filters.priceBelow)}</span>
				{/if}
				{#if status === 'ready'}
					<span class="text-gray-400 tabular-nums">{candidates.length} {candidates.length === 1 ? 'card' : 'cards'} left</span>
				{/if}
			{/if}
		</div>
	{/if}
</div>
