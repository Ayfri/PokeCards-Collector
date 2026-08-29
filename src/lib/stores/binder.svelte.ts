/**
 * Card codes sitting in the binder page's storage row. Shared as module state rather than through context because the
 * header search bar lives in the layout, above the page that owns the binder, and adds searched cards straight to it.
 */
class BinderStorage {
	cards = $state<string[]>([]);

	/** Appends the codes that are not in the storage yet, keeping the order the user built. */
	add(cardCodes: string[]) {
		const known = new Set(this.cards);
		const additions = [...new Set(cardCodes)].filter(cardCode => !known.has(cardCode));
		if (additions.length) this.cards = [...this.cards, ...additions];
	}

	remove(cardCode: string) {
		this.cards = this.cards.filter(code => code !== cardCode);
	}

	clear() {
		this.cards = [];
	}
}

export const binderStorage = new BinderStorage();
