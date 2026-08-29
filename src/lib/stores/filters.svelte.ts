import type { Set as CardSet } from '$lib/types';
import { persistedRecord } from './persisted.svelte';

export type SortOrder = 'asc' | 'desc';

/** The lowercased values `isVisible` tests a card against. */
export interface ActiveFilters {
	artist: string;
	name: string;
	numero: string;
	rarity: string;
	set: string;
	supertype: string;
	type: string;
}

export const SORT_OPTIONS = [
	{ value: 'sort-artist', label: 'Illustrator' },
	{ value: 'sort-id', label: 'ID' },
	{ value: 'sort-name', label: 'Name' },
	{ value: 'sort-pokedex', label: 'Pokédex' },
	{ value: 'sort-price', label: 'Price' },
	{ value: 'sort-rarity', label: 'Rarity' },
	{ value: 'sort-release-date', label: 'Release Date' },
];

export const SUPERTYPE_OPTIONS = [
	{ value: 'all', label: 'All supertypes' },
	{ value: 'pokémon', label: 'Pokémon' },
	{ value: 'trainer', label: 'Trainer' },
	{ value: 'energy', label: 'Energy' },
];

/** `?type=` carries the accent-free supertype, the filter itself holds the lowercased catalogue value. */
const SUPERTYPE_PARAMS: Record<string, string> = { 'pokémon': 'pokemon', trainer: 'trainer', energy: 'energy' };
const SUPERTYPES_BY_PARAM = new Map(Object.entries(SUPERTYPE_PARAMS).map(([supertype, param]) => [param, supertype]));

const DEFAULTS = {
	artist: 'all',
	mostExpensiveOnly: false,
	name: '',
	numero: '',
	rarity: 'all',
	set: 'all',
	sortBy: 'sort-pokedex',
	sortOrder: 'asc' as SortOrder,
	supertype: 'all',
	type: 'all',
};

/** Every filter the card grid reads, shared by the grid, its filter drawer and the pages that seed it from the URL. */
class CardFilters {
	#values = persistedRecord('card-filters', DEFAULTS);

	get artist() { return this.#values.artist; }
	set artist(value: string) { this.#values.artist = value; }

	get mostExpensiveOnly() { return this.#values.mostExpensiveOnly; }
	set mostExpensiveOnly(value: boolean) { this.#values.mostExpensiveOnly = value; }

	get name() { return this.#values.name; }
	set name(value: string) { this.#values.name = value; }

	get numero() { return this.#values.numero; }
	set numero(value: string) { this.#values.numero = value; }

	get rarity() { return this.#values.rarity; }
	set rarity(value: string) { this.#values.rarity = value; }

	get set() { return this.#values.set; }
	set set(value: string) { this.#values.set = value; }

	get sortBy() { return this.#values.sortBy; }
	set sortBy(value: string) { this.#values.sortBy = value; }

	get sortOrder() { return this.#values.sortOrder; }
	set sortOrder(value: SortOrder) { this.#values.sortOrder = value; }

	get supertype() { return this.#values.supertype; }
	set supertype(value: string) { this.#values.supertype = value; }

	get type() { return this.#values.type; }
	set type(value: string) { this.#values.type = value; }

	/** The name is the only value a user types raw, every other one is stored lowercased already. */
	readonly active: ActiveFilters = $derived({
		artist: this.artist,
		name: this.name.toLowerCase(),
		numero: this.numero,
		rarity: this.rarity,
		set: this.set,
		supertype: this.supertype,
		type: this.type,
	});

	/** Whether anything narrows the card list, so the grid can skip the filtering pass entirely. */
	readonly hasActive = $derived(
		this.name !== '' || this.numero !== ''
		|| [this.artist, this.rarity, this.set, this.supertype, this.type].some(value => value !== 'all'),
	);

	/** Badge count on the filters button, sort included since resetting also restores it. */
	readonly count = $derived(
		[this.name, this.numero, this.mostExpensiveOnly, this.sortBy !== DEFAULTS.sortBy].filter(Boolean).length
		+ [this.artist, this.rarity, this.set, this.supertype, this.type].filter(value => value !== 'all').length,
	);

	/** The URL parameter matching the current supertype, `null` when every supertype is shown. */
	get supertypeParam() {
		return this.supertype === 'all' ? null : SUPERTYPE_PARAMS[this.supertype] ?? this.supertype;
	}

	reset() {
		Object.assign(this, DEFAULTS);
	}

	/**
	 * Seeds the filters from `?set=…&artist=…` and friends. A single recognised parameter resets everything else first,
	 * so a link lands on exactly what it names rather than on top of whatever the visitor last picked.
	 */
	applyFromUrl(url: URL, sets: CardSet[]) {
		const params = url.searchParams;
		const value = (key: string) => params.get(key)?.trim().toLowerCase() || null;

		const set = value('set');
		const artist = value('artist');
		const supertype = SUPERTYPES_BY_PARAM.get(value('type') ?? '');
		const name = params.get('name')?.trim();
		const type = value('pokemontype');
		const sortBy = value('sortby');
		const sortOrder = value('sortorder');
		const rarity = value('rarity');
		const mostExpensiveOnly = value('mostexpensive') === 'true';

		if (!set && !artist && !supertype && !name && !type && !sortBy && !sortOrder && !rarity && !mostExpensiveOnly) return;

		this.reset();

		if (set) this.set = sets.find(candidate => candidate.name.toLowerCase() === set)?.name.toLowerCase() ?? set;
		if (artist) this.artist = artist;
		if (supertype) this.supertype = supertype;
		if (name) this.name = name;
		if (type) this.type = type;
		if (sortBy && SORT_OPTIONS.some(option => option.value === sortBy)) this.sortBy = sortBy;
		if (sortOrder === 'asc' || sortOrder === 'desc') this.sortOrder = sortOrder;
		if (rarity) this.rarity = rarity;
		this.mostExpensiveOnly = mostExpensiveOnly;
	}
}

export const filters = new CardFilters();

/** Which sections of the filter drawer are unfolded. */
export const filterSections = persistedRecord('filter-sections', {
	basic: true,
	collection: true,
	type: true,
});
