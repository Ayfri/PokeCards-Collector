<script lang="ts">
	import { filters, filterSections, SORT_OPTIONS, SUPERTYPE_OPTIONS } from '#stores/filters.svelte.ts';
	import type { Set } from '#lib/types.js';
	import Button from '#components/filters/Button.svelte';
	import Section from '#components/filters/Section.svelte';
	import Select from '#components/filters/Select.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
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

	/** The text inputs debounce, so they hold their own value until the filter catches up, and follow URL seeding and resets. */
	let searchNumero = $derived(filters.numero);
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

		const focusedId = (document.activeElement as HTMLElement | null)?.id;

		goto(url.toString(), { replace: true }).then(() => {
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

	const typeOptions = $derived([
		{ label: 'All types', value: 'all' },
		...types.map(type => ({ label: type, value: type.toLowerCase() })),
	]);
</script>

<div class="w-full">
	<Section bind:isOpen={filterSections.basic} title="Basic Filters">
		<div class="flex flex-col gap-2 md:gap-4">
			<div class="flex flex-wrap gap-4">
				<div class="flex flex-col gap-1 min-w-32 flex-1">
					<label class="text-xs text-gray-300" for="sort">Sort by</label>
					<div class="flex items-center gap-2">
						<Button
							class="rounded-sm w-10 min-w-10"
							onClick={toggleSortDirection}
						>
							{#if filters.sortOrder === 'asc'}
								<ArrowUp size={16} />
							{:else}
								<ArrowDown size={16} />
							{/if}
						</Button>
						<Select
							activeCondition={false}
							bind:value={() => filters.sortBy, selectSort}
							id="sort"
							label=""
							options={SORT_OPTIONS}
						/>
					</div>
				</div>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col md:hidden">
				<TextInput
					bind:value={searchName}
					id="name"
					label="Name"
					onDebouncedInput={value => (filters.name = value)}
					placeholder="Search by name..."
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<TextInput
					bind:value={searchNumero}
					id="numero"
					label="Pokémon ID"
					onDebouncedInput={value => {
						filters.numero = value.trim();
						applyFilterParam('pokemon', filters.numero || null);
					}}
					placeholder="Enter Pokémon ID..."
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

	<Section bind:isOpen={filterSections.type} title="Type Filters">
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<Select
				bind:value={() => filters.supertype, selectSupertype}
				id="supertype"
				label="Card Type"
				options={SUPERTYPE_OPTIONS}
			/>

			<Select
				bind:value={() => filters.type, selectType}
				id="pokemontype"
				label="Pokémon Type"
				options={typeOptions}
			/>

			<Select
				bind:value={() => filters.rarity, selectRarity}
				id="rarity"
				label="Rarity"
				options={rarityOptions}
			/>
		</div>
	</Section>

	<Section bind:isOpen={filterSections.collection} title="Collection Filters">
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<Select
				bind:value={() => filters.set, selectSet}
				id="set"
				label="Set"
				options={setOptions}
			/>

			<Select
				bind:value={() => filters.artist, selectArtist}
				id="artist"
				label="Illustrator"
				options={artistOptions}
			/>
		</div>
	</Section>
</div>
