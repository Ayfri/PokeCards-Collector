<script lang="ts">
	import { filters, filterSections, SORT_OPTIONS, SUPERTYPE_OPTIONS } from '$stores/filters.svelte';
	import type { Set } from '$lib/types';
	import Button from '@components/filters/Button.svelte';
	import Section from '@components/filters/Section.svelte';
	import Select from '@components/filters/Select.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	interface Props {
		artists?: string[];
		rarities: string[];
		sets: Set[];
		types: string[];
	}

	let {
		artists = [],
		rarities,
		sets,
		types,
	}: Props = $props();

	/** The text inputs debounce, so they hold their own value until the filter catches up. */
	let searchNumero = $state(filters.numero);
	let searchName = $state(filters.name);

	/**
	 * Writes one filter param to the URL and navigates without a reload, keeping the focused control focused.
	 * A `null` value drops the parameter instead of setting it.
	 */
	function applyFilterParam(param: string, value: string | null) {
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set(param, value);
		} else {
			url.searchParams.delete(param);
		}

		const focusedId = (document.activeElement as HTMLElement | null)?.id;

		goto(url.toString(), { replaceState: true }).then(() => {
			if (focusedId) document.querySelector<HTMLElement>(`#${focusedId}`)?.focus();
		});
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

	function toggleSortDirection() {
		filters.sortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
		applyFilterParam('sortorder', filters.sortOrder);
	}

	function toggleMostExpensiveOnly() {
		filters.mostExpensiveOnly = !filters.mostExpensiveOnly;
		applyFilterParam('mostexpensive', filters.mostExpensiveOnly ? 'true' : null);
	}

	const artistOptions = $derived([
		{ value: 'all', label: 'All illustrators' },
		...artists.map(artist => ({ value: artist.toLowerCase(), label: artist })),
	]);

	const rarityOptions = $derived([
		{ value: 'all', label: 'All rarities' },
		...rarities.map(rarity => ({ value: rarity.toLowerCase(), label: rarity })),
	]);

	const setOptions = $derived([
		{ value: 'all', label: 'All sets' },
		...sets.map(set => ({ value: set.name.toLowerCase(), label: set.name })),
	]);

	const typeOptions = $derived([
		{ value: 'all', label: 'All types' },
		...types.map(type => ({ value: type.toLowerCase(), label: type })),
	]);
</script>

<div class="w-full">
	<Section title="Basic Filters" bind:isOpen={filterSections.basic}>
		<div class="flex flex-col gap-2 md:gap-4">
			<div class="flex flex-wrap gap-4">
				<div class="flex flex-col gap-1 min-w-32 flex-1">
					<label for="sort" class="text-xs text-gray-300">Sort by</label>
					<div class="flex items-center gap-2">
						<Button
							class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded-sm text-sm h-8 w-10 min-w-10 transition-all duration-300 z-0"
							onClick={toggleSortDirection}
						>
							<span class="relative z-10">
								{#if filters.sortOrder === 'asc'}
									<ArrowUp size={16} />
								{:else}
									<ArrowDown size={16} />
								{/if}
							</span>
						</Button>
						<Select
							activeCondition={false}
							id="sort"
							label=""
							options={SORT_OPTIONS}
							bind:value={() => filters.sortBy, selectSort}
						/>
					</div>
				</div>
			</div>

			<!-- Name Search (Mobile Only) -->
			<div class="flex flex-wrap gap-4 sm:flex-row flex-col md:hidden">
				<TextInput
					id="name"
					label="Name"
					bind:value={searchName}
					placeholder="Search by name..."
					debounceFunction={value => (filters.name = value)}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<TextInput
					id="numero"
					label="Pokémon ID"
					bind:value={searchNumero}
					placeholder="Enter Pokémon ID..."
					debounceFunction={value => (filters.numero = value)}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<Button
					class="w-full"
					isActive={filters.mostExpensiveOnly}
					onClick={toggleMostExpensiveOnly}
				>
					{filters.mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
				</Button>
			</div>
		</div>
	</Section>

	<Section title="Type Filters" bind:isOpen={filterSections.type}>
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<Select
				id="supertype"
				label="Card Type"
				options={SUPERTYPE_OPTIONS}
				bind:value={() => filters.supertype, selectSupertype}
			/>

			<Select
				id="pokemontype"
				label="Pokémon Type"
				options={typeOptions}
				bind:value={() => filters.type, selectType}
			/>

			<Select
				id="rarity"
				label="Rarity"
				options={rarityOptions}
				bind:value={() => filters.rarity, selectRarity}
			/>
		</div>
	</Section>

	<Section title="Collection Filters" bind:isOpen={filterSections.collection}>
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<Select
				id="set"
				label="Set"
				options={setOptions}
				bind:value={() => filters.set, selectSet}
			/>

			<Select
				id="artist"
				label="Illustrator"
				options={artistOptions}
				bind:value={() => filters.artist, selectArtist}
			/>
		</div>
	</Section>
</div>
