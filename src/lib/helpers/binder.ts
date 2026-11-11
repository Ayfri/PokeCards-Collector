import { isCardCode } from '#helpers/card-utils.ts';
import type { BinderCard } from '#lib/types.js';
import { STORAGE_PREFIX } from '#stores/persisted.svelte.ts';

/** A card code or a raw image URL (`isCardCode` tells them apart), the same two kinds of key the tray holds. `null` is an empty pocket. */
export type BinderSlot = string | null;
export type BinderSheet = readonly BinderSlot[];
export interface BinderLayout { columns: number; rows: number }
export interface BinderDoc extends BinderLayout { pages: readonly BinderSheet[]; tray: readonly string[] }
export interface StoredBinder extends BinderDoc { id: string; name: string }
export type BinderTab = 'all' | 'mine' | 'sets' | 'tray';
export type BinderSort = 'name' | 'natural' | 'number' | 'price' | 'set';
export interface BinderView {
	hidePlaced: boolean;
	mine: { collection: boolean; wishlist: boolean };
	ownedOverlay: boolean;
	sortBy: BinderSort;
	sortOrder: 'asc' | 'desc';
	tab: BinderTab;
}
export interface BinderRecord {
	activeId: string;
	binders: readonly StoredBinder[];
	/** Binder id to its published share id, outside the undo history since the share lives on the server. */
	shares: Readonly<Record<string, string>>;
	spread: boolean;
	version: 1;
	view: BinderView;
}
export interface SlotRef { page: number; position: number }
export type BinderDrag = { key: string; kind: 'card' } | { index: number; kind: 'page' } | { kind: 'slot'; page: number; position: number };

export const MAX_POCKETS = 8;
export const MAX_HISTORY = 100;
export const MAX_FILL = 1000;
export const MAX_NAME = 60;
export const BINDER_RECORD_KEY = `${STORAGE_PREFIX}binder`;
export const BINDER_BACKUP_KEY = `${STORAGE_PREFIX}binder-backup`;
export const DRAG_TYPE = 'application/x-pokecards-binder';
/** Set next to `DRAG_TYPE` on a slot drag only: a `dragover` cannot read the payload, but it can list the types, so the cards panel tells a card coming back from any other drag. */
export const DRAG_SLOT_TYPE = `${DRAG_TYPE}-slot`;
/** How the owned overlay fades a card, the same on a board pocket and on a panel tile. */
export const DIMMED = 'opacity-35 grayscale';
export const DEFAULT_VIEW: BinderView = {
	hidePlaced: false,
	mine: { collection: true, wishlist: true },
	ownedOverlay: false,
	sortBy: 'natural',
	sortOrder: 'asc',
	tab: 'tray'
};

const DEFAULT_NAME = 'My binder';
const DEFAULT_POCKETS = 3;
const SORTS: readonly BinderSort[] = ['name', 'natural', 'number', 'price', 'set'];
const TABS: readonly BinderTab[] = ['all', 'mine', 'sets', 'tray'];

const isString = (value: unknown): value is string => typeof value === 'string';
const asRecord = (value: unknown): Record<string, unknown> | null => (typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.find(option => option === value) ?? fallback;
const clampPockets = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_POCKETS, Math.max(1, Math.round(value))) : DEFAULT_POCKETS);
const storedPockets = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : DEFAULT_POCKETS);
/** An empty string is no card, whatever stored it, so a slot or a tray key is either a non-empty string or nothing. */
const slotKey = (value: unknown): BinderSlot => (isString(value) && value ? value : null);
/** The tray holds each key once: a stored duplicate would make the card list's keyed `each` throw. */
const parseTray = (value: unknown): string[] => (Array.isArray(value) ? [...new Set(value.map(slotKey).filter(key => key !== null))] : []);

export function emptySheet(size: number): BinderSlot[] {
	return new Array<BinderSlot>(size).fill(null);
}

export function newBinder(name: string, layout: BinderLayout = { columns: DEFAULT_POCKETS, rows: DEFAULT_POCKETS }): StoredBinder {
	return { ...layout, id: crypto.randomUUID(), name, pages: [emptySheet(layout.columns * layout.rows)], tray: [] };
}

/** Each field falls back on its own, so adding a field to the view does not invalidate what users already stored. */
function parseView(value: unknown): BinderView {
	const source = asRecord(value);
	const mine = asRecord(source?.mine);
	return {
		hidePlaced: flag(source?.hidePlaced, DEFAULT_VIEW.hidePlaced),
		mine: { collection: flag(mine?.collection, DEFAULT_VIEW.mine.collection), wishlist: flag(mine?.wishlist, DEFAULT_VIEW.mine.wishlist) },
		ownedOverlay: flag(source?.ownedOverlay, DEFAULT_VIEW.ownedOverlay),
		sortBy: pick(source?.sortBy, SORTS, DEFAULT_VIEW.sortBy),
		sortOrder: pick(source?.sortOrder, ['asc', 'desc'], DEFAULT_VIEW.sortOrder),
		tab: pick(source?.tab, TABS, DEFAULT_VIEW.tab)
	};
}

/** Every sheet is cut or padded to `size`, so a stored page can never disagree with the layout. At least one sheet is returned. */
function parsePages(value: unknown, size: number, slotOf: (slot: unknown) => BinderSlot): BinderSheet[] {
	if (!Array.isArray(value) || !value.length) return [emptySheet(size)];
	return value.map(sheet => Array.from({ length: size }, (_, index) => (Array.isArray(sheet) ? slotOf(sheet[index]) : null)));
}

function parseBinder(value: unknown): StoredBinder | null {
	const source = asRecord(value);
	if (!source || !isString(source.id) || !isString(source.name) || !Array.isArray(source.pages)) return null;

	const columns = clampPockets(source.columns);
	const rows = clampPockets(source.rows);
	return {
		columns,
		id: source.id,
		name: source.name.trim().slice(0, MAX_NAME) || DEFAULT_NAME,
		pages: parsePages(source.pages, columns * rows, slotKey),
		rows,
		tray: parseTray(source.tray)
	};
}

/** One corrupt binder is dropped and counted, never the whole record, so the others stay readable. `null` means nothing usable was stored. */
export function parseRecord(raw: string): { dropped: number; record: BinderRecord } | null {
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return null;
	}

	const source = asRecord(value);
	if (!source || source.version !== 1 || !Array.isArray(source.binders)) return null;

	const binders = source.binders.map(parseBinder).filter(binder => binder !== null);
	if (!binders.length) return null;

	return {
		dropped: source.binders.length - binders.length,
		record: {
			activeId: binders.find(binder => binder.id === source.activeId)?.id ?? binders[0].id,
			binders,
			shares: Object.fromEntries(Object.entries(asRecord(source.shares) ?? {}).flatMap(([id, share]): [string, string][] => (isString(share) ? [[id, share]] : []))),
			spread: flag(source.spread, true),
			version: 1,
			view: parseView(source.view)
		}
	};
}

function readJson(storage: Pick<Storage, 'getItem'>, key: string): unknown {
	try {
		const raw = storage.getItem(key);
		return raw === null ? null : JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * Builds the first record from the three keys of the single-binder version. Each key is read on its own, so one corrupt key never
 * empties the others. Nothing is deleted here: the old keys stay as the user's fallback.
 */
export function migrateLegacy(storage: Pick<Storage, 'getItem'>): BinderRecord {
	const grid = asRecord(readJson(storage, 'binderGridData'));
	const tray = readJson(storage, 'binderStoredCards');
	const view = asRecord(readJson(storage, `${STORAGE_PREFIX}binder-storage-view`));

	const columns = clampPockets(grid?.columns);
	const rows = clampPockets(grid?.rows);
	/** The old page accepted more than 8 pockets per side (the input's `max` does not stop typing), so its sheets are read at the stored size, then reflowed into the clamped one. */
	const storedSize = storedPockets(grid?.columns) * storedPockets(grid?.rows);
	const pages = parsePages(grid?.pages, storedSize, slot => {
		const source = asRecord(slot);
		return slotKey(source?.cardCode ?? source?.url);
	});
	const binder: StoredBinder = {
		...newBinder(DEFAULT_NAME, { columns, rows }),
		pages: storedSize === columns * rows ? pages : reflow(pages, columns * rows),
		tray: parseTray(tray)
	};

	return {
		activeId: binder.id,
		binders: [binder],
		shares: {},
		spread: flag(grid?.spread, true),
		version: 1,
		view: parseView(view && { ...view, sortBy: view.sortBy === 'type' ? 'natural' : view.sortBy })
	};
}

/** Cuts a flat slot list into `count` sheets of `size`, padding the last one with empty pockets. */
function cut(slots: readonly BinderSlot[], size: number, count: number): BinderSheet[] {
	return Array.from({ length: count }, (_, page) => Array.from({ length: size }, (_, position) => slots[page * size + position] ?? null));
}

/** Resizing reflows the slots in order across the pages, so a smaller pocket grid loses no card. */
export function reflow(pages: readonly BinderSheet[], size: number): BinderSheet[] {
	const slots = pages.flat();
	return cut(slots, size, Math.max(1, Math.ceil((slots.findLastIndex(slot => slot !== null) + 1) / size)));
}

/** Fills the empty slots in order with the given keys, adding pages until every key is placed. */
export function fillSlots(pages: readonly BinderSheet[], keys: readonly string[], size: number): BinderSheet[] {
	const slots = pages.flat();
	let next = 0;
	for (const key of keys) {
		while (next < slots.length && slots[next] !== null) next++;
		slots[next] = key;
	}
	return cut(slots, size, Math.ceil(slots.length / size));
}

/** Works on the flattened slots: `insert` makes room at the slot and pushes the rest one later, `close` removes the slot and pulls the rest back. */
export function shiftSlots(pages: readonly BinderSheet[], at: SlotRef, size: number, mode: 'close' | 'insert'): BinderSheet[] {
	const slots = pages.flat();
	const index = at.page * size + at.position;
	if (index < 0 || index >= slots.length) return [...pages];

	if (mode === 'close') {
		slots.splice(index, 1);
		return reflow([slots], size);
	}

	slots.splice(index, 0, null);
	/** The last pocket is the only one that can fall off the end: a page is added for it only when it holds a card. */
	if (slots.at(-1) === null) slots.pop();
	return cut(slots, size, Math.ceil(slots.length / size));
}

/** One collator per order: `localeCompare` with a locale or options builds a new one on every call, which costs seconds on 21k cards. */
export const compareLocalIds = new Intl.Collator('en', { numeric: true }).compare;
const compareText = new Intl.Collator().compare;

const COMPARATORS: Record<Exclude<BinderSort, 'natural'>, (a: BinderCard, b: BinderCard) => number> = {
	name: (a, b) => compareText(a.name, b.name),
	number: (a, b) => compareLocalIds(a.localId, b.localId) || compareText(a.name, b.name),
	price: (a, b) => (a.price ?? 0) - (b.price ?? 0),
	set: (a, b) => compareText(a.setId, b.setId) || compareLocalIds(a.localId, b.localId)
};

/**
 * Card codes always come before URL items, whatever the order. `natural` keeps the input order, which `desc` reverses.
 * The sort is stable, so equal cards keep the order they came in.
 */
export function sortBinderCards(cards: readonly BinderCard[], sortBy: BinderSort, order: 'asc' | 'desc'): BinderCard[] {
	const sign = order === 'asc' ? 1 : -1;
	const compare = sortBy === 'natural' ? () => 0 : COMPARATORS[sortBy];
	const source = sortBy === 'natural' && order === 'desc' ? cards.toReversed() : cards;
	return source.toSorted((a, b) => Number(isCardCode(b.cardCode)) - Number(isCardCode(a.cardCode)) || sign * compare(a, b));
}

/** The lower-cased text a search looks into, built once per card: a keystroke then costs one `includes` per card instead of three `toLowerCase`. */
const haystacks = new WeakMap<BinderCard, string>();

/** Keeps the cards whose name, set name or code holds the term. */
export function searchCards(cards: readonly BinderCard[], term: string): readonly BinderCard[] {
	const needle = term.trim().toLowerCase();
	if (!needle) return cards;

	return cards.filter(card => {
		let haystack = haystacks.get(card);
		if (haystack === undefined) {
			haystack = `${card.name}\n${card.setName}\n${card.cardCode}`.toLowerCase();
			haystacks.set(card, haystack);
		}
		return haystack.includes(needle);
	});
}

/** Created on first use in the browser, never at import time: the module is also evaluated on the server. */
let tabId: string | undefined;

/**
 * Every payload carries the id of the tab that started the drag. A `slot` or `page` payload holds indices into that tab's binder, so another
 * window, whose binder can differ, ignores it. A `card` payload is a key, valid everywhere.
 */
export function setDrag(event: DragEvent, payload: BinderDrag) {
	if (!event.dataTransfer) return;
	tabId ??= crypto.randomUUID();
	const json = JSON.stringify({ ...payload, tab: tabId });
	/** Firefox only starts a drag when `text/plain` data is set. */
	event.dataTransfer.setData('text/plain', json);
	event.dataTransfer.setData(DRAG_TYPE, json);
	if (payload.kind === 'slot') event.dataTransfer.setData(DRAG_SLOT_TYPE, json);
	event.dataTransfer.effectAllowed = 'copyMove';
}

/** The data can only be read on `drop`: a `dragover` handler checks `event.dataTransfer?.types.includes(DRAG_TYPE)` instead. */
export function readDrag(event: DragEvent): BinderDrag | null {
	const raw = event.dataTransfer?.getData(DRAG_TYPE);
	if (!raw) return null;

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return null;
	}

	const source = asRecord(value);
	if (source?.kind === 'card' && isString(source.key)) return { key: source.key, kind: 'card' };
	if (!tabId || source?.tab !== tabId) return null;
	if (source?.kind === 'page' && Number.isInteger(source.index)) return { index: Number(source.index), kind: 'page' };
	if (source?.kind === 'slot' && Number.isInteger(source.page) && Number.isInteger(source.position)) return { kind: 'slot', page: Number(source.page), position: Number(source.position) };
	return null;
}

/** True when the pointer left the element for good, not when it moved onto one of its children. */
export function dragLeft(event: DragEvent & { currentTarget: HTMLElement }): boolean {
	return !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget));
}

export function isEditableTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable);
}
