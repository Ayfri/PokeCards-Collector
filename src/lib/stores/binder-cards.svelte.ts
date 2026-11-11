import { compareLocalIds } from '#helpers/binder.ts';
import { isCardCode } from '#helpers/card-utils.ts';
import type { BinderCard, BinderCatalogueCard, BinderOwnedPayload, BinderSet, BinderTile } from '#lib/types.js';
import { binder } from '#stores/binder.svelte.ts';

/** The card lookup of the binder page: the header search bar and the board both resolve keys through it, so it is module state like the binder store. */
class BinderCards {
	/** Fetched from `/api/binder` rather than sent in the document, so the page paints before the catalogue arrives. */
	catalogue = $state.raw<readonly BinderCatalogueCard[]>([]);

	/** Fetched with the catalogue, newest first. */
	sets = $state.raw<readonly BinderSet[]>([]);

	/** False until `/api/binder` lands, so a tile waiting on its card shows a placeholder rather than an error. */
	readonly ready = $derived(this.catalogue.length > 0);

	/** The viewer's collection and wishlist in all three catalogues, once `loadOwned` has answered. */
	owned = $state.raw<BinderOwnedPayload | null>(null);

	ownedStatus = $state<'error' | 'idle' | 'loading' | 'ready'>('idle');

	/** The codes of the viewer's collection, from the layout so an edit made elsewhere reaches the overlay. `null` when signed out. */
	ownedCodes = $state.raw<ReadonlySet<string> | null>(null);

	/**
	 * The catalogue keyed by card code, so a tile resolves its card without scanning 21066 of them. Mine and placed Japanese or French cards resolve
	 * through the viewer's own lists: `/api/binder` is the English catalogue only, so owned cards fill in what it lacks and never override it.
	 */
	readonly byCode: ReadonlyMap<string, BinderCard> = $derived.by(() => {
		const cards = new Map<string, BinderCard>(this.catalogue.map(card => [card.cardCode, card]));
		for (const card of [...(this.owned?.collection ?? []), ...(this.owned?.wishlist ?? [])]) {
			if (!cards.has(card.cardCode)) cards.set(card.cardCode, card);
		}
		return cards;
	});

	/** The cards of each set in number order. */
	readonly bySet: ReadonlyMap<string, readonly BinderCatalogueCard[]> = $derived.by(() => {
		const groups = new Map<string, BinderCatalogueCard[]>();
		for (const card of this.catalogue) {
			const group = groups.get(card.setId);
			if (group) group.push(card);
			else groups.set(card.setId, [card]);
		}
		for (const group of groups.values()) group.sort((a, b) => compareLocalIds(a.localId, b.localId));
		return groups;
	});

	/** One lookup per tile instead of a scan of the sets. */
	readonly setsById: ReadonlyMap<string, BinderSet> = $derived(new Map(this.sets.map(set => [set.setId, set])));

	/**
	 * The catalogue by set, newest set first, then by number inside a set, for the All cards tab to open on recent cards. The cards without a scan
	 * follow, since the newest set usually has none yet and would open the tab on a wall of plates, then the cards of a set `sets` lacks.
	 */
	readonly byRelease: readonly BinderCatalogueCard[] = $derived.by(() => {
		const ordered = this.sets.flatMap(set => this.bySet.get(set.setId) ?? []);
		return [...ordered.filter(card => card.image), ...ordered.filter(card => !card.image), ...this.catalogue.filter(card => !this.setsById.has(card.setId))];
	});

	/** A URL key comes back dressed as a card, so the tray and the board treat both kinds of key alike. */
	get(key: string): BinderCard | undefined {
		if (isCardCode(key)) return this.byCode.get(key);
		return { cardCode: key, image: key, localId: '', name: 'Card from a URL', price: null, rarity: '', setId: '', setName: '', types: '' };
	}

	async loadOwned(): Promise<void> {
		if (this.ownedStatus === 'loading' || this.ownedStatus === 'ready') return;
		this.ownedStatus = 'loading';

		try {
			const response = await fetch('/api/binder/owned');
			if (!response.ok) throw new Error(`/api/binder/owned answered ${response.status}`);
			this.owned = await response.json() as BinderOwnedPayload;
			this.ownedStatus = 'ready';
		} catch (error) {
			console.error('Failed to load your cards:', error);
			this.ownedStatus = 'error';
		}
	}

	/** The overlay only dims a card code the viewer does not own: an image URL has no owner, and a signed-out visitor has no collection. */
	isDimmed(key: string): boolean {
		return binder.view.ownedOverlay && this.ownedCodes !== null && isCardCode(key) && !this.ownedCodes.has(key);
	}

	tile(key: string): BinderTile {
		const card = this.get(key);
		if (!card) return { image: '', key, name: this.ready ? 'Not in the English catalogue' : 'Loading card' };
		return { dimmed: this.isDimmed(key), image: card.image, key, name: card.name, types: card.types };
	}
}

export const binderCards = new BinderCards();
