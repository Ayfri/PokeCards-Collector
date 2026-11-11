import { MediaQuery } from 'svelte/reactivity';
import {
	BINDER_BACKUP_KEY,
	BINDER_RECORD_KEY,
	DEFAULT_VIEW,
	emptySheet,
	fillSlots,
	MAX_FILL,
	MAX_HISTORY,
	MAX_POCKETS,
	migrateLegacy,
	parseRecord,
	reflow,
	shiftSlots,
	type BinderLayout,
	type BinderRecord,
	type BinderSheet,
	type BinderSlot,
	type BinderView,
	type SlotRef,
	type StoredBinder
} from '#helpers/binder.ts';

interface Snapshot { activeId: string; binders: readonly StoredBinder[] }

/** The record the server and the first client render draw: one empty page, replaced by `load()` once mounted. */
const PENDING: BinderRecord = {
	activeId: 'pending',
	binders: [{ columns: 3, id: 'pending', name: 'My binder', pages: [emptySheet(9)], rows: 3, tray: [] }],
	shares: {},
	spread: true,
	version: 1,
	view: DEFAULT_VIEW
};

const UNREADABLE = "Some saved binders could not be read. A copy is kept in this browser's storage.";
const SAVE_FAILED = 'The latest changes are not saved: this browser storage is full or blocked. Delete pages to free space, or allow site data.';

/**
 * The binders, their trays and the state of the page around them. Shared as module state rather than through context because the
 * header search bar lives in the layout, above the page that owns the binder, and adds searched cards straight to its tray.
 */
class BinderStore {
	/** Raw: every write replaces the record, its binders and their page arrays, none writes into one in place. */
	#record = $state.raw<BinderRecord>(PENDING);
	/** Saving only starts once the stored record is loaded, so the empty defaults never overwrite it. */
	#loaded = $state(false);
	/** Whole-record snapshots, so deleting a binder is undoable too. Raw for the same reason as the record. */
	#past = $state.raw<readonly Snapshot[]>([]);
	#future = $state.raw<readonly Snapshot[]>([]);
	#lastAction = $state<string | null>(null);
	#notice = $state<string | null>(null);
	#saveError = $state<string | null>(null);
	#wide = new MediaQuery('min-width: 48rem');
	/** The stored string this tab last read or wrote, so `load()` can tell that another tab saved in between. Not reactive: nothing draws it. */
	#raw: string | null = null;

	currentPage = $state(0);
	/** Card key armed for click-to-place, `null` when none. */
	armed = $state<string | null>(null);
	/** Slot picked up with the keyboard or a tap, waiting for its destination. */
	held = $state.raw<SlotRef | null>(null);

	readonly active: StoredBinder = $derived(this.#record.binders.find(binder => binder.id === this.#record.activeId) ?? this.#record.binders[0]);
	readonly pages: readonly BinderSheet[] = $derived(this.active.pages);
	readonly rows = $derived(this.active.rows);
	readonly columns = $derived(this.active.columns);
	readonly tray: readonly string[] = $derived(this.active.tray);
	readonly slotsPerPage = $derived(this.rows * this.columns);
	readonly filledSlots = $derived(this.pages.reduce((total, sheet) => total + sheet.filter(Boolean).length, 0));
	/** A slot holds either a card code or a raw URL, and the tray uses the same two kinds of key. */
	readonly placed: ReadonlySet<string> = $derived(new Set(this.pages.flat().filter((key): key is string => key !== null)));
	/** Counts the keys, not the difference of the two lists: a placed card that left the tray must not push it below zero. */
	readonly trayLeft = $derived(this.tray.filter(key => !this.placed.has(key)).length);
	/** Global index of the slot an armed card lands in: the first empty one from the current page onwards. */
	readonly nextEmpty = $derived.by(() => {
		if (!this.armed) return -1;
		for (let page = this.currentPage; page < this.pages.length; page++) {
			const position = this.pages[page].findIndex(slot => slot === null);
			if (position !== -1) return page * this.slotsPerPage + position;
		}
		return -1;
	});
	/**
	 * A spread opens on an even page, so page 1 sits left of page 2 the way the sheets are bound, and it only shows from `md`.
	 * The default record has one page, so the server, which reads the MediaQuery as false, and the first client render show the same single page.
	 */
	readonly visiblePages: readonly number[] = $derived.by(() => {
		if (!this.#spreadShown) return [this.currentPage];
		const left = this.currentPage - (this.currentPage % 2);
		return [left, left + 1].filter(index => index < this.pages.length);
	});
	readonly canUndo = $derived(this.#past.length > 0);
	readonly canRedo = $derived(this.#future.length > 0);

	get #spreadShown() {
		return this.#record.spread && this.#wide.current;
	}

	get binders() { return this.#record.binders; }
	get activeId() { return this.#record.activeId; }
	get shares() { return this.#record.shares; }
	get spread() { return this.#record.spread; }
	get view() { return this.#record.view; }
	get loaded() { return this.#loaded; }
	get lastAction() { return this.#lastAction; }
	get notice() { return this.#notice; }
	get saveError() { return this.#saveError; }

	/**
	 * Reads the saved record, so it is called from `onMount` only: the server never has a `localStorage`. The store outlives the page, and the
	 * `storage` event only reaches a mounted page, so a later call re-reads the key: another tab may have saved while this one was elsewhere,
	 * and keeping the old record would overwrite its work on the next edit. An unchanged string keeps the history.
	 */
	load() {
		if (this.#loaded) {
			if (this.#read() !== this.#raw) this.reload();
			return;
		}

		/** A blocked storage throws on the global itself, so the page loads an empty binder and the first save reports the failure. */
		let storage: Pick<Storage, 'getItem'> = { getItem: () => null };
		let raw: string | null = null;
		try {
			storage = localStorage;
			raw = storage.getItem(BINDER_RECORD_KEY);
		} catch { /* A blocked storage reads as an empty one. */ }

		let parsed: ReturnType<typeof parseRecord> = null;
		if (raw !== null) {
			parsed = parseRecord(raw);
			if (!parsed || parsed.dropped) this.#backUp(raw);
		}
		this.#record = parsed?.record ?? migrateLegacy(storage);
		this.#raw = raw;
		this.#loaded = true;
		/** A record saved right away pins the version: the legacy keys stay untouched as the user's fallback. */
		if (raw === null) this.#save();
	}

	/** Another tab saved: its record wins, and the history, which belongs to this tab's edits, is dropped. */
	reload() {
		if (!this.#loaded) return;
		const raw = this.#read();
		const parsed = raw === null ? null : parseRecord(raw);
		if (!parsed) return;

		this.#raw = raw;
		this.#record = parsed.record;
		this.#past = [];
		this.#future = [];
		this.armed = null;
		this.held = null;
		this.#clampPage();
	}

	undo() {
		const snapshot = this.#past.at(-1);
		if (!snapshot) return;
		this.#future = [...this.#future, this.#snapshot()];
		this.#past = this.#past.slice(0, -1);
		this.#restore(snapshot, 'Undone');
	}

	redo() {
		const snapshot = this.#future.at(-1);
		if (!snapshot) return;
		this.#past = [...this.#past, this.#snapshot()];
		this.#future = this.#future.slice(0, -1);
		this.#restore(snapshot, 'Redone');
	}

	setLayout(layout: Partial<BinderLayout>) {
		const clamp = (value: number | undefined, current: number) => (value === undefined || !Number.isFinite(value) ? current : Math.min(MAX_POCKETS, Math.max(1, Math.round(value))));
		const columns = clamp(layout.columns, this.columns);
		const rows = clamp(layout.rows, this.rows);
		if (columns === this.columns && rows === this.rows) return;
		this.#edit(binder => ({ ...binder, columns, pages: reflow(binder.pages, columns * rows), rows }), 'Layout changed');
	}

	setSpread(spread: boolean) {
		this.#update({ spread });
	}

	setView(patch: Partial<BinderView>) {
		this.#update({ view: { ...this.view, ...patch } });
	}

	goTo(page: number) {
		this.currentPage = Math.min(Math.max(0, page), this.pages.length - 1);
	}

	goBy(direction: -1 | 1) {
		this.goTo(this.visiblePages[0] + direction * (this.#spreadShown ? 2 : 1));
	}

	/** The card that leaves a slot, replaced or removed, goes back to the tray when it is missing, so it is never lost from the list the user built. */
	place(at: SlotRef, key: string) {
		this.armed = null;
		const previous = this.pages[at.page]?.[at.position];
		if (previous === undefined || previous === key) return;
		this.#edit(binder => ({ ...binder, pages: this.#withSlot(binder.pages, at, key), tray: this.#trayWith(binder.tray, previous) }), 'Card placed');
	}

	move(from: SlotRef, to: SlotRef) {
		this.held = null;
		const source = this.pages[from.page]?.[from.position];
		const target = this.pages[to.page]?.[to.position];
		if (source == null || target === undefined || (from.page === to.page && from.position === to.position)) return;
		this.#edit(binder => ({ ...binder, pages: this.#withSlot(this.#withSlot(binder.pages, from, target), to, source) }), 'Card moved');
	}

	/** Dropping a slot back onto the tray empties it and puts the card back in the list if it was removed from it. */
	remove(at: SlotRef) {
		const key = this.pages[at.page]?.[at.position];
		if (!key) return;
		this.#edit(binder => ({ ...binder, pages: this.#withSlot(binder.pages, at, null), tray: this.#trayWith(binder.tray, key) }), 'Card removed');
	}

	/** Closing a gap removes the slot, so its card goes back to the tray like any card that leaves a slot. */
	shift(at: SlotRef, mode: 'close' | 'insert') {
		const key = this.pages[at.page]?.[at.position];
		if (key === undefined) return;
		this.#edit(binder => ({ ...binder, pages: shiftSlots(binder.pages, at, this.slotsPerPage, mode), tray: mode === 'close' ? this.#trayWith(binder.tray, key) : binder.tray }), mode === 'close' ? 'Gap closed' : 'Gap inserted');
	}

	addPage() {
		this.#edit(binder => ({ ...binder, pages: [...binder.pages, emptySheet(this.slotsPerPage)] }), 'Page added');
		this.goTo(this.pages.length - 1);
	}

	duplicatePage(index: number) {
		if (!this.pages[index]) return;
		this.#edit(binder => ({ ...binder, pages: binder.pages.flatMap((sheet, at) => (at === index ? [sheet, sheet] : [sheet])) }), 'Page duplicated');
		this.goTo(index + 1);
	}

	/** The page actions do not return their cards to the tray, since they are undoable. An action that would change nothing leaves no history step. */
	emptyPage(index: number) {
		if (!this.pages[index]?.some(Boolean)) return;
		this.#edit(binder => ({ ...binder, pages: binder.pages.map((sheet, at) => (at === index ? emptySheet(sheet.length) : sheet)) }), 'Page emptied');
	}

	/** Deleting the only page leaves one fresh empty page, so a binder always has a page to drop cards on. */
	deletePage(index: number) {
		if (!this.pages[index] || (this.pages.length === 1 && !this.filledSlots)) return;
		const kept = this.pages.filter((_, at) => at !== index);
		this.#edit(binder => ({ ...binder, pages: kept.length ? kept : [emptySheet(this.slotsPerPage)] }), 'Page deleted');
	}

	movePage(from: number, to: number) {
		if (!this.pages[from] || !this.pages[to] || from === to) return;
		const pages = [...this.pages];
		pages.splice(to, 0, ...pages.splice(from, 1));
		this.#edit(binder => ({ ...binder, pages }), 'Page moved');
		this.goTo(to);
	}

	emptyAllPages() {
		if (!this.filledSlots) return;
		this.#edit(binder => ({ ...binder, pages: binder.pages.map(sheet => emptySheet(sheet.length)) }), 'All pages emptied');
	}

	/** Pours the keys as given, minus the placed ones, into the empty slots. A list over `MAX_FILL` is refused: an unfiltered catalogue would add thousands of pages. */
	fill(keys: readonly string[]) {
		const fresh = [...new Set(keys)].filter(key => !this.placed.has(key));
		if (!fresh.length || fresh.length > MAX_FILL) return;
		this.armed = null;
		this.#edit(binder => ({ ...binder, pages: fillSlots(binder.pages, fresh, this.slotsPerPage) }), `${fresh.length} card${fresh.length > 1 ? 's' : ''} placed`);
	}

	/** Appends the codes that are not in the tray yet, keeping the order the user built. */
	addToTray(keys: readonly string[]) {
		const known = new Set(this.tray);
		const additions = [...new Set(keys)].filter(key => !known.has(key));
		if (additions.length) this.#edit(binder => ({ ...binder, tray: [...binder.tray, ...additions] }), 'Added to the tray');
	}

	removeFromTray(key: string) {
		if (!this.tray.includes(key)) return;
		if (this.armed === key) this.armed = null;
		this.#edit(binder => ({ ...binder, tray: binder.tray.filter(item => item !== key) }), 'Removed from the tray');
	}

	clearTray() {
		if (!this.tray.length) return;
		this.armed = null;
		this.#edit(binder => ({ ...binder, tray: [] }), 'Tray cleared');
	}

	#snapshot(): Snapshot {
		return { activeId: this.activeId, binders: this.binders };
	}

	#withSlot(pages: readonly BinderSheet[], at: SlotRef, key: BinderSlot): BinderSheet[] {
		return pages.map((sheet, index) => (index === at.page ? sheet.with(at.position, key) : sheet));
	}

	#trayWith(tray: readonly string[], key: BinderSlot): readonly string[] {
		return key && !tray.includes(key) ? [...tray, key] : tray;
	}

	/** Applies a change to the active binder as one undoable step. */
	#edit(change: (binder: StoredBinder) => StoredBinder, label: string) {
		this.#commit(this.binders.map(binder => (binder.id === this.active.id ? change(binder) : binder)), label);
	}

	/** Every mutation goes through here. Nothing happens before `load()`, so the defaults never reach the history or the storage. */
	#commit(binders: readonly StoredBinder[], label: string, activeId = this.activeId) {
		if (!this.#loaded) return;
		this.#past = [...this.#past, this.#snapshot()].slice(-MAX_HISTORY);
		this.#future = [];
		this.held = null;
		this.#update({ activeId, binders });
		this.#clampPage();
		this.#lastAction = label;
	}

	#restore(snapshot: Snapshot, label: string) {
		this.armed = null;
		this.held = null;
		this.#update(snapshot);
		this.#clampPage();
		this.#lastAction = label;
	}

	#update(patch: Partial<BinderRecord>) {
		if (!this.#loaded) return;
		this.#record = { ...this.#record, ...patch };
		this.#save();
	}

	#clampPage() {
		this.currentPage = Math.min(this.currentPage, this.pages.length - 1);
	}

	/** A full or blocked storage must be visible: a save that only logged would let the user work on without ever knowing it was lost. */
	#save() {
		try {
			const raw = JSON.stringify(this.#record);
			localStorage.setItem(BINDER_RECORD_KEY, raw);
			this.#raw = raw;
			this.#saveError = null;
		} catch {
			this.#saveError = SAVE_FAILED;
		}
	}

	#read(): string | null {
		try {
			return localStorage.getItem(BINDER_RECORD_KEY);
		} catch {
			return null;
		}
	}

	#backUp(raw: string) {
		try {
			localStorage.setItem(BINDER_BACKUP_KEY, raw);
			this.#notice = UNREADABLE;
		} catch {
			this.#notice = 'Some saved binders could not be read, and no copy could be kept.';
		}
	}
}

export const binder = new BinderStore();
