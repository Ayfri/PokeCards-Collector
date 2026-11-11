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

export function emptySheet(size: number): BinderSlot[] {
	return new Array<BinderSlot>(size).fill(null);
}

export function newBinder(name: string, layout: BinderLayout = { columns: DEFAULT_POCKETS, rows: DEFAULT_POCKETS }): StoredBinder {
	return { ...layout, id: crypto.randomUUID(), name, pages: [emptySheet(layout.columns * layout.rows)], tray: [] };
}

export function defaultRecord(): BinderRecord {
	const binder = newBinder(DEFAULT_NAME);
	return { activeId: binder.id, binders: [binder], shares: {}, spread: true, version: 1, view: parseView(null) };
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
		pages: parsePages(source.pages, columns * rows, slot => (isString(slot) ? slot : null)),
		rows,
		tray: Array.isArray(source.tray) ? source.tray.filter(isString) : []
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
	const binder: StoredBinder = {
		...newBinder(DEFAULT_NAME, { columns, rows }),
		pages: parsePages(grid?.pages, columns * rows, slot => {
			const source = asRecord(slot);
			const key = source?.cardCode ?? source?.url;
			return isString(key) ? key : null;
		}),
		tray: Array.isArray(tray) ? tray.filter(isString) : []
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

export function setDrag(event: DragEvent, payload: BinderDrag) {
	if (!event.dataTransfer) return;
	const json = JSON.stringify(payload);
	/** Firefox only starts a drag when `text/plain` data is set. */
	event.dataTransfer.setData('text/plain', json);
	event.dataTransfer.setData(DRAG_TYPE, json);
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
	if (source?.kind === 'page' && Number.isInteger(source.index)) return { index: Number(source.index), kind: 'page' };
	if (source?.kind === 'slot' && Number.isInteger(source.page) && Number.isInteger(source.position)) return { kind: 'slot', page: Number(source.page), position: Number(source.position) };
	return null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable);
}
