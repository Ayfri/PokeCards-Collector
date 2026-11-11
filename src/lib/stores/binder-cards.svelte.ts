import { isCardCode } from '#helpers/card-utils.ts';
import type { BinderCatalogueCard, BinderTile } from '#lib/types.js';

/** The card lookup of the binder page: the header search bar and the board both resolve keys through it, so it is module state like the binder store. */
class BinderCards {
	/** Fetched from `/api/binder` rather than sent in the document, so the page paints before the catalogue arrives. */
	catalogue = $state.raw<readonly BinderCatalogueCard[]>([]);

	/** False until `/api/binder` lands, so a tile waiting on its card shows a placeholder rather than an error. */
	readonly ready = $derived(this.catalogue.length > 0);

	/** The catalogue keyed by card code, so a tile resolves its card without scanning 21066 of them. */
	readonly byCode: ReadonlyMap<string, BinderCatalogueCard> = $derived(new Map(this.catalogue.map(card => [card.cardCode, card])));

	/** A URL key comes back dressed as a card, so the tray and the board treat both kinds of key alike. */
	get(key: string): BinderCatalogueCard | undefined {
		if (isCardCode(key)) return this.byCode.get(key);
		return { cardCode: key, image: key, localId: '', name: 'Card from a URL', price: null, rarity: '', setId: '', setName: '', types: '' };
	}

	tile(key: string): BinderTile {
		const card = this.get(key);
		if (!card) return { image: '', key, name: this.ready ? 'Not in the English catalogue' : 'Loading card' };
		return { image: card.image, key, name: card.name, types: card.types };
	}
}

export const binderCards = new BinderCards();
