<script lang="ts">
	import type { PageData } from './$types';
	import type { PokemonListEntry } from './+page.server';
	import { formatEuros, pluralize, titleCase } from '#helpers/format.ts';
	import GroupHeading from '#components/list/GroupHeading.svelte';
	import { getPokemonImageSrc, handlePokemonImageError } from '#helpers/pokemon-utils.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import PageHeader, { type PageStat } from '#components/PageHeader.svelte';
	import ScrollButton from '#components/list/ScrollButton.svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import Chip from '#components/filters/Chip.svelte';
	import FilterBar from '#components/filters/FilterBar.svelte';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SortControl from '#components/filters/SortControl.svelte';
	import SquareStackIcon from '@lucide/svelte/icons/square-stack';
	import TextInput from '#components/filters/TextInput.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import TypeSymbolDefs from '#components/card/TypeSymbolDefs.svelte';
	import { GENERATIONS } from '#src/constants.ts';
	import { collection } from '#stores/collection.svelte.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** The first two rows of a wide screen load their sprites right away, the rest wait until they scroll near. */
	const EAGER_TILES = 12;

	/** Tailwind sees these class names whole, so the glow colour of a type cannot be built from its name. */
	const TYPE_GLOW: Record<string, string> = {
		colorless: '[--glow:var(--colorless)]',
		darkness: '[--glow:var(--darkness)]',
		dragon: '[--glow:var(--dragon)]',
		fairy: '[--glow:var(--fairy)]',
		fighting: '[--glow:var(--fighting)]',
		fire: '[--glow:var(--fire)]',
		grass: '[--glow:var(--grass)]',
		lightning: '[--glow:var(--lightning)]',
		metal: '[--glow:var(--metal)]',
		psychic: '[--glow:var(--psychic)]',
		water: '[--glow:var(--water)]',
	};

	/** Totals reach five figures, so cents are noise and are dropped from 100 EUR up. */
	const euros = (value: number) => formatEuros(value, value >= 100 ? 0 : 2);

	const COMPARATORS: Record<string, (a: PokemonListEntry, b: PokemonListEntry) => number> = {
		cardCount: (a, b) => a.cardCount - b.cardCount,
		name: (a, b) => a.name.localeCompare(b.name),
		pokedex: (a, b) => a.id - b.id,
		price: (a, b) => a.price - b.price,
	};

	let sortBy = $state('pokedex');
	let sortOrder: 'asc' | 'desc' = $state('asc');
	/** The field shows every keystroke, the filter only follows the debounced `searchTerm`: each change redraws up to 1025 tiles. */
	let searchInput = $state('');
	let searchTerm = $state('');
	let typeFilter = $state('all');

	const types = $derived([...new Set(data.pokemons.map(pokemon => pokemon.type).filter(Boolean))].sort());

	/** Sorted on a sort change only: the search and the type filter keep that order, since the sort is stable and filtering drops entries without moving any. */
	const sortedPokemons = $derived.by(() => {
		const direction = sortOrder === 'asc' ? 1 : -1;
		const compare = COMPARATORS[sortBy] ?? COMPARATORS.pokedex;
		return data.pokemons.toSorted((a, b) => direction * compare(a, b));
	});

	/** Lowercased once per data, not once per Pokémon per search. */
	const lowerNames = $derived(new Map(data.pokemons.map(pokemon => [pokemon, pokemon.name.toLowerCase()])));

	const filteredPokemons = $derived.by(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term && typeFilter === 'all') return sortedPokemons;
		return sortedPokemons.filter(pokemon => lowerNames.get(pokemon)?.includes(term) && (typeFilter === 'all' || pokemon.type === typeFilter));
	});

	function setSearchTerm(value: string) {
		searchTerm = value;
	}

	const countHint = $derived(filteredPokemons.length === data.pokemons.length ? undefined : `${filteredPokemons.length.toLocaleString('en-US')} of ${data.pokemons.length.toLocaleString('en-US')}`);

	/** Totals of the whole list, not of the search or the type filter. */
	const stats = $derived.by((): PageStat[] => {
		const withCards = data.pokemons.filter(pokemon => pokemon.cardCount > 0).length;

		return [
			{ icon: LibraryIcon, label: 'Pokémon', value: data.pokemons.length.toLocaleString('en-US') },
			...(withCards === data.pokemons.length ? [] : [{ icon: LayersIcon, label: 'with cards', title: 'Pokémon that appear on at least one card', value: withCards.toLocaleString('en-US') }]),
			{ icon: SquareStackIcon, label: 'Pokémon cards', title: 'Cards that depict a Pokémon', value: data.pokemons.reduce((count, pokemon) => count + pokemon.cardCount, 0).toLocaleString('en-US') },
			{ icon: FlameIcon, label: 'types', title: 'Main types of the Pokémon', value: types.length.toLocaleString('en-US') },
		];
	});

	/** Generation headers only make sense in Pokédex order over the whole list: any other sort or filter is one flat grid. */
	const byGeneration = $derived(sortBy === 'pokedex' && !searchTerm.trim() && typeFilter === 'all');

	/** Owned cards per Pokémon, capped at its card count; the map is empty for a logged-out visitor. The progress takes no space of its own (a longer count line and an absolute strip), so the collection loading moves nothing. */
	const ownedPerPokemon = $derived(collection.ownedPerPokemon);
	const ownedOf = (pokemon: PokemonListEntry) => Math.min(ownedPerPokemon.get(pokemon.id) ?? 0, pokemon.cardCount);

	const sections = $derived.by(() => {
		if (!byGeneration) return [{ cards: 0, generation: undefined, owned: 0, pokemons: filteredPokemons }];

		const buckets = GENERATIONS.map(generation => ({ cards: 0, generation, owned: 0, pokemons: [] as PokemonListEntry[] }));
		for (const pokemon of filteredPokemons) {
			const index = GENERATIONS.findIndex(generation => pokemon.id <= generation.last);
			const bucket = buckets[index === -1 ? buckets.length - 1 : index];
			bucket.pokemons.push(pokemon);
			bucket.cards += pokemon.cardCount;
			bucket.owned += ownedOf(pokemon);
		}
		return sortOrder === 'asc' ? buckets : buckets.reverse();
	});

	let scrollY = $state(0);
</script>

<svelte:window bind:scrollY />

<div class="container mx-auto px-4 pb-8 text-white">
	<PageHeader
		class="mb-3"
		lede="Every Pokémon with its TCG cards and its priciest card. Jump to a generation or filter by type."
		{stats}
		title="All Pokémon"
	>
		{#snippet controls()}
			<FilterBar>
				{#snippet search()}
					<TextInput
						applyOnMount
						bind:value={searchInput}
						clearable
						hint={countHint}
						icon={SearchIcon}
						id="pokemon-search"
						label="Search"
						onDebouncedInput={setSearchTerm}
						placeholder="Search Pokémon..."
					/>
				{/snippet}
				{#snippet sort()}
					<SortControl
						bind:sortDirection={sortOrder}
						bind:sortValue={sortBy}
						icon={ArrowUpDownIcon}
						options={[
							{ label: 'Pokédex #', value: 'pokedex' },
							{ label: 'Name', value: 'name' },
							{ label: 'Card Count', value: 'cardCount' },
							{ label: 'Most Valuable', value: 'price' }
						]}
					/>
				{/snippet}
			</FilterBar>
		{/snippet}
	</PageHeader>

	<!-- A single scrolling row on a phone so the grid stays close to the top, a wrapping one from `md`. The padding keeps the focus ring of a chip from being clipped by the scroller. -->
	<div aria-label="Filter by type" class="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 scrollbar-hide [&>button]:shrink-0 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group">
		<Chip isActive={typeFilter === 'all'} onClick={() => (typeFilter = 'all')}><span class="px-1.5">All types</span></Chip>
		{#each types as type (type)}
			<Chip isActive={typeFilter === type} onClick={() => (typeFilter = typeFilter === type ? 'all' : type)}>
				<span class="flex items-center gap-1.5 px-1.5"><TypeSymbol class="text-sm" decorative shared {type} />{titleCase(type)}</span>
			</Chip>
		{/each}
	</div>

	<TypeSymbolDefs />

	{#if byGeneration}
		<nav aria-label="Generations" class="jump-links mt-3">
			{#each GENERATIONS as generation (generation.region)}
				<a class="jump-link" href="#gen-{generation.region.toLowerCase()}">{generation.region}</a>
			{/each}
		</nav>
	{/if}

	{#each sections as section, sectionIndex (section.generation?.region ?? 'all')}
		<!-- The fixed header covers the top of the viewport, so `scroll-mt-28` lands a jump link's heading below it. -->
		<section class={['scroll-mt-28', sectionIndex ? 'mt-8' : 'mt-4']} id={section.generation && `gen-${section.generation.region.toLowerCase()}`}>
		{#if section.generation}
			<GroupHeading meta={[`#${section.generation.first} - #${section.generation.last}`, `${section.owned ? `${section.owned} / ` : ''}${pluralize(section.cards, 'card')}`]} name={section.generation.region} />
		{/if}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
		{#each section.pokemons as pokemon, index (pokemon.id)}
			{@const owned = ownedOf(pokemon)}
			<!-- A real link, not a button calling `goto`: crawlers only follow `href`s, and this page is the one hub linking every Pokémon. -->
			<a
				class="card-tile focus-ring group relative overflow-hidden p-3 flex flex-col items-center text-center [content-visibility:auto] [contain-intrinsic-size:auto_11rem]"
				href={pokemon.path || undefined}
				title={`View the most valuable ${titleCase(pokemon.name)} card`}
			>
				<div class={['relative w-24 h-24 md:w-28 md:h-28 mb-2', pokemon.type && 'type-glow', TYPE_GLOW[pokemon.type]]}>
					{#if !NO_IMAGES}
						<img
							alt={titleCase(pokemon.name)}
							class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 ease-in-out"
							decoding="async"
							height="112"
							loading={sectionIndex === 0 && index < EAGER_TILES ? 'eager' : 'lazy'}
							onerror={(e) => handlePokemonImageError(e, pokemon.id, pokemon.fallbackImage)}
							src={getPokemonImageSrc(pokemon.id)}
							width="112"
						/>
					{:else}
						<div class="w-full h-full flex items-center justify-center text-white text-sm bg-gray-700 rounded-md">
							#{pokemon.id}
						</div>
					{/if}
					<div class="absolute -top-1.5 -right-1.5 bg-gray-700 text-gold-400 text-xs font-bold rounded-full size-7 flex items-center justify-center shadow-md border border-gold-400/50">
						{pokemon.id}
					</div>
				</div>
				<span class="flex items-center justify-center gap-1.5 text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">
					{titleCase(pokemon.name)}
					{#if pokemon.type}
						<TypeSymbol shared type={pokemon.type} />
					{/if}
				</span>
				<span class="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-1" title="Cards featuring this Pokémon">
					<span aria-hidden="true" class="icon-layers size-3 shrink-0"></span>
					{owned ? `${owned} / ` : ''}{pokemon.cardCount} card{pokemon.cardCount === 1 ? '' : 's'}
				</span>
				{#if pokemon.price}
					<span class="text-xs font-semibold text-green-400">{euros(pokemon.price)}</span>
				{/if}
				{#if owned}
					<span class="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" title="{owned} of {pokemon.cardCount} cards in your collection"><span class="block h-full bg-gold-400" style="width: {(owned / pokemon.cardCount) * 100}%"></span></span>
				{/if}
			</a>
		{/each}
		</div>
		</section>
	{/each}
</div>

<ScrollButton direction="up" onclick={() => window.scrollTo({ behavior: 'smooth', top: 0 })} visible={scrollY > 100} />
<ScrollButton direction="down" onclick={() => window.scrollTo({ behavior: 'smooth', top: document.documentElement.scrollHeight })} />
