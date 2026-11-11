<script lang="ts">
	import { filters, filterSections, SORT_OPTIONS, SUPERTYPE_OPTIONS } from '#stores/filters.svelte.ts';
	import type { GridPokemon, Set } from '#lib/types.js';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import Chip from '#components/filters/Chip.svelte';
	import PokemonPicker from '#components/filters/PokemonPicker.svelte';
	import Section from '#components/filters/Section.svelte';
	import Select from '#components/filters/Select.svelte';
	import SortControl from '#components/filters/SortControl.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import BrushIcon from '@lucide/svelte/icons/brush';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ShapesIcon from '@lucide/svelte/icons/shapes';
	import UserRoundIcon from '@lucide/svelte/icons/user-round';
	import ZapIcon from '@lucide/svelte/icons/zap';

	interface Props {
		artists?: string[];
		pokemons: GridPokemon[];
		rarities: string[];
		sets: Set[];
		types: string[];
	}

	let {
		artists = [],
		pokemons,
		rarities,
		sets,
		types,
	}: Props = $props();

	/** The text input debounces, so it holds its own value until the filter catches up, and follows URL seeding and resets. */
	let searchName = $derived(filters.name);

	/**
	 * Writes one filter param to the URL and navigates without a reload, keeping the focused control focused.
	 * A `null` value drops the parameter instead of setting it.
	 */
	function applyFilterParam(param: string, value: string | null) {
		const url = new URL(page.url.href);
		if (value) {
			url.searchParams.set(param, value);
		} else {
			url.searchParams.delete(param);
		}

		/** `reset: false` leaves the control focused: a default navigation blurs it, and the picker would lose its draft and reopen on the refocus. */
		goto(url.toString(), { replace: true, reset: false });
	}

	/** Every dropdown drops its parameter on `all`, so a cleared filter leaves no trace in the URL. */
	function pick(param: string, value: string) {
		applyFilterParam(param, value === 'all' ? null : value);
	}

	function selectSupertype(value: string) {
		filters.supertype = value;
		applyFilterParam('type', filters.supertypeParam);
	}

	function selectType(value: string) {
		filters.type = value;
		pick('pokemontype', value);
	}

	function selectRarity(value: string) {
		filters.rarity = value;
		pick('rarity', value);
	}

	function selectSet(value: string) {
		filters.set = value;
		pick('set', value);
	}

	function selectArtist(value: string) {
		filters.artist = value;
		pick('artist', value);
	}

	function selectSort(value: string) {
		filters.sortBy = value;
		applyFilterParam('sortby', value);
	}

	function selectSortOrder(value: 'asc' | 'desc') {
		filters.sortOrder = value;
		applyFilterParam('sortorder', value);
	}

	function toggleMostExpensiveOnly() {
		filters.mostExpensiveOnly = !filters.mostExpensiveOnly;
		applyFilterParam('mostexpensive', filters.mostExpensiveOnly ? 'true' : null);
	}

	const artistOptions = $derived([
		{ label: 'All illustrators', value: 'all' },
		...artists.map(artist => ({ label: artist, value: artist.toLowerCase() })),
	]);

	const rarityOptions = $derived([
		{ label: 'All rarities', value: 'all' },
		...rarities.map(rarity => ({ label: rarity, value: rarity.toLowerCase() })),
	]);

	const setOptions = $derived([
		{ label: 'All sets', value: 'all' },
		/** A set name shared by two languages (`151`, `Jungle`) is one entry: the filter matches on the name. */
		...[...new Map(sets.map(set => [set.name.toLowerCase(), set.name]))].map(([value, label]) => ({ label, value })),
	]);

	const supertypeIcons: Record<string, LucideIcon> = { energy: ZapIcon, 'pokémon': PawPrintIcon, trainer: UserRoundIcon };

	const typeOptions = $derived(types.map(type => ({ label: type, value: type.toLowerCase() })));

	const hintId = $props.id();
</script>

{#snippet rarityOption(option: { label: string; value: string })}
	<RaritySymbol class="text-sm" decorative rarity={option.label} />
	{option.label}
{/snippet}

<div class="w-full">
	<Section bind:isOpen={filterSections.basic} count={filters.sectionCounts.basic} icon={ArrowUpDownIcon} title="Sort & search">
		<div class="flex flex-col gap-2 md:gap-3">
			<div class="flex flex-wrap gap-3">
				<SortControl
					active={filters.sortKeyChanged}
					bind:sortDirection={() => filters.sortOrder, selectSortOrder}
					bind:sortValue={() => filters.sortBy, selectSort}
					icon={ArrowUpDownIcon}
					options={SORT_OPTIONS}
				/>
			</div>

			<div class="flex flex-wrap gap-3 sm:flex-row flex-col md:hidden">
				<TextInput
					bind:value={searchName}
					icon={SearchIcon}
					id="name"
					label="Name"
					onDebouncedInput={value => (filters.name = value)}
					placeholder="Search by name..."
				/>
			</div>

			<div class="flex flex-wrap gap-3 sm:flex-row flex-col">
				<PokemonPicker
					id="numero"
					label="Pokémon"
					onClear={() => {
						filters.numero = '';
						applyFilterParam('pokemon', null);
					}}
					onPick={numero => {
						filters.numero = numero;
						applyFilterParam('pokemon', numero);
					}}
					{pokemons}
					value={filters.numero}
				/>
			</div>

			<button
				aria-checked={filters.mostExpensiveOnly}
				class={[
					'focus-ring flex w-full cursor-pointer items-center gap-3 rounded-sm border-2 px-3 py-1.5 text-left transition-all duration-200 hover:border-gold-400',
					filters.mostExpensiveOnly ? 'border-gold-400' : 'border-white/30',
				]}
				aria-describedby={hintId}
				onclick={toggleMostExpensiveOnly}
				role="switch"
				type="button"
			>
				<EuroIcon class={filters.mostExpensiveOnly ? 'text-gold-400' : 'text-gray-400'} size={18} />
				<span class="flex min-w-0 flex-1 flex-col">
					<span class={['text-sm', filters.mostExpensiveOnly ? 'text-gold-400' : 'text-white']}>Most expensive print only</span>
					<span class="text-xs text-gray-400" id={hintId}>Keeps the priciest print of each card</span>
				</span>
				<span class={['relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200', filters.mostExpensiveOnly ? 'bg-gold-400' : 'bg-white/20']}>
					<span class={['absolute top-0.5 left-0 size-4 rounded-full bg-white transition-transform duration-200', filters.mostExpensiveOnly ? 'translate-x-4.5' : 'translate-x-0.5']}></span>
				</span>
			</button>
		</div>
	</Section>

	<Section bind:isOpen={filterSections.type} count={filters.sectionCounts.type} icon={ShapesIcon} title="Card">
		<div class="flex flex-col gap-2">
			<div aria-labelledby="supertype-label" class="flex flex-col gap-1" role="group">
				<span class="text-xs text-gray-300" id="supertype-label">Card Type</span>
				<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
					{#each SUPERTYPE_OPTIONS as option (option.value)}
						{@const Icon = supertypeIcons[option.value]}
						<Chip isActive={filters.supertype === option.value} onClick={() => selectSupertype(filters.supertype === option.value ? 'all' : option.value)}>
							{#if Icon}
								<Icon size={14} />
							{/if}
							<span class="truncate">{option.label}</span>
						</Chip>
					{/each}
				</div>
			</div>

			<div aria-labelledby="pokemontype-label" class="flex flex-col gap-1" role="group">
				<span class="text-xs text-gray-300" id="pokemontype-label">Pokémon Type</span>
				<div class="grid grid-cols-3 gap-1 md:grid-cols-4">
					<Chip isActive={filters.type === 'all'} onClick={() => selectType('all')}>All</Chip>
					{#each typeOptions as option (option.value)}
						<Chip isActive={filters.type === option.value} onClick={() => selectType(filters.type === option.value ? 'all' : option.value)}>
							<TypeSymbol class="text-sm" decorative type={option.label} />
							<span class="truncate">{option.label}</span>
						</Chip>
					{/each}
				</div>
			</div>

			<Select
				bind:value={() => filters.rarity, selectRarity}
				id="rarity"
				label="Rarity"
				option={rarityOption}
				options={rarityOptions}
			/>
		</div>
	</Section>

	<Section bind:isOpen={filterSections.collection} count={filters.sectionCounts.collection} icon={LibraryIcon} title="Set & illustrator">
		<div class="flex flex-wrap gap-2 md:gap-3 sm:flex-row flex-col">
			<Select
				bind:value={() => filters.set, selectSet}
				icon={LayersIcon}
				id="set"
				label="Set"
				options={setOptions}
			/>

			<Select
				bind:value={() => filters.artist, selectArtist}
				icon={BrushIcon}
				id="artist"
				label="Illustrator"
				options={artistOptions}
			/>
		</div>
	</Section>
</div>
