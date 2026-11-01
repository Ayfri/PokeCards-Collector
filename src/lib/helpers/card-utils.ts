import { CATALOGUES, type Catalogue, type Language } from '#helpers/catalogues.ts';
import type { Card, FullCard, Pokemon, PriceData, Set as CardSet } from '#lib/types.js';

/**
 * The Trainer and Energy sections a card's `subtype` can fill, in display order. They are TCGdex's English `trainerType` / `energyType` values:
 * its basic Energy is `Normal`, not `Basic`. `verify` and `check` flag any other subtype so a new TCGdex value or an untranslated one shows up.
 */
export const SUBTYPE_SECTIONS = [
	{ label: 'Supporters', subtype: 'Supporter', supertype: 'Trainer' },
	{ label: 'Items', subtype: 'Item', supertype: 'Trainer' },
	{ label: 'Stadiums', subtype: 'Stadium', supertype: 'Trainer' },
	{ label: 'Tools', subtype: 'Tool', supertype: 'Trainer' },
	{ label: 'Technical Machines', subtype: 'Technical Machine', supertype: 'Trainer' },
	{ label: "Rocket's Secret Machines", subtype: "Rocket's Secret Machine", supertype: 'Trainer' },
	{ label: 'Basic Energy', subtype: 'Normal', supertype: 'Energy' },
	{ label: 'Special Energy', subtype: 'Special', supertype: 'Energy' },
] as const;

/** Display name of a Trainer/Energy group: a trailing letters-only parenthetical names the art's character ("Professor's Research (Professor Oak)"), while one with a digit is part of the card ("PokéDex (HANDY909)"). */
export function cardGroupName(name: string): string {
	return name.replace(/\s*\([\p{L}\s'’.]+\)$/u, '').trim();
}

/** The curly apostrophe is folded because both "Bill's Maintenance" and "Bill’s Maintenance" exist in the data. */
export function cardGroupKey(card: Pick<Card, 'name' | 'pokemonNumber' | 'supertype'>): string {
	if (card.supertype === 'Pokémon' && card.pokemonNumber) return `pokemon_${card.pokemonNumber}`;
	const name = card.supertype === 'Pokémon' ? card.name : cardGroupName(card.name);
	return `${card.supertype.toLowerCase()}_${name.toLowerCase().replaceAll('’', "'")}`;
}

/**
 * `supertype_pokemonId_setCode_cardNumber`, like `pokemon_6_sv3_125`. The set part is the legacy code, or `fr` + the TCGdex id for French cards.
 */
export function generateUniqueCardCode(
	pokemonId: number | string,
	urlCode: string | undefined,
	cardNumber: string | undefined,
	supertype: string = 'pokemon'
): string {
	const normalizedSupertype = (supertype || 'pokemon')
		.toLowerCase()
		.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]/g, '');

	/** Maps "pokmon", what `Pokémon` becomes when the `é` is dropped instead of decomposed, back to "pokemon". */
	const finalSupertype = normalizedSupertype === "pokmon" ? "pokemon" : normalizedSupertype;

	const normalizedUrlCode = (urlCode || '')
		.toLowerCase()
		.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]/g, '');

	/** Normalized like the set code: letters stay, so "H7" and "7" remain distinct cards. */
	const normalizedCardNumber = (cardNumber || '')
		.toLowerCase()
		.normalize("NFD").replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]/g, '');

	return `${finalSupertype}_${pokemonId}_${normalizedUrlCode}_${normalizedCardNumber}`;
}

/** A card's price in EUR: the Cardmarket average, else its trend, 30-day average or lowest listing. `null` when none is above 0. */
export function cardPrice(price: PriceData | undefined): number | null {
	const value = price?.simple ?? price?.trend ?? price?.avg30 ?? price?.low ?? null;
	return value && value > 0 ? value : null;
}

/**
 * The number as printed: uppercase like the card ("TG01", "R"), over the set total only when it is a plain number.
 * A lettered one sits outside that count: the 30th Celebration Mews read "R/RGB", never "R/128".
 * A numeric number loses its leading zeros (`081` -> `81/162`), a lettered one (`TG05`, `SV033`) keeps its printed form.
 * `printed` keeps the zeros as the card prints them, the total padded to the same width (`05/48`), for the plate that imitates the card.
 */
export function formatCardNumber(cardNumber: string, printedTotal?: number | null, { printed = false } = {}): string {
	const number = cardNumber.toUpperCase();
	if (!/^\d+$/.test(number)) return number;
	const shown = printed ? number : String(Number(number));
	if (!printedTotal) return shown;
	return `${shown}/${printed ? String(printedTotal).padStart(number.length, '0') : printedTotal}`;
}

/** How many cards a set holds: `printedTotal` is the numbering denominator, which TCGdex leaves at 0 on the promo sets. */
export const setCardCount = (set: Pick<CardSet, 'printedTotal' | 'totalCards'>) => set.totalCards || set.printedTotal;

/** The fields a card's public URL is built from; every card payload carries them, so a link needs no extra data. */
export type CardLink = Pick<Card, 'localId' | 'name' | 'setId' | 'setName'>;

const SLUG_SYMBOLS: Record<string, string> = {
	'&': ' and ',
	'δ': ' delta ',
	'☆': ' star ',
	'★': ' star ',
	'◇': ' prism-star ',
	'♀': ' female ',
	'♂': ' male ',
};

/**
 * Lowercase letters and digits of any script joined by single hyphens, `Black & White` -> `black-and-white`, `Flabébé` -> `flabebe`.
 * Accents are stripped and the text is composed again, so Japanese `ガ` keeps its dakuten. `'` and `.` vanish instead of splitting (`farfetchd`, `mr-mime`).
 * `ex`, `gx` and `v` stay words (`charizard-ex`). French spells `&` as `et`, so French URLs read like the French names (`rouge-feu-et-vert-feuille`).
 */
export function slugify(value: string, language: Language = 'en'): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.normalize('NFC')
		.toLowerCase()
		.replace(/[&δ☆★◇♀♂]/g, symbol => (symbol === '&' && language === 'fr' ? ' et ' : SLUG_SYMBOLS[symbol]))
		.replace(/['’.]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-|-$/g, '');
}

/**
 * `name-set-number`, like `charizard-ex-obsidian-flames-125`. It depends only on the card's own fields, so adding a card never moves another card's URL.
 * Japanese cards keep their Japanese name, and their set part is the set id because Japanese set names repeat (`SV4a` and `SV3a` are both "レイジングサーフ").
 * A numeric number loses its leading zeros like `formatCardNumber` does, a lettered one keeps its form (`tg01`), and the Unown `!` and `?` are spelled out.
 */
export function cardSlug(card: CardLink, language: Language): string {
	return cardSlugParts(card, language).filter(Boolean).join('-');
}

/** The `[name, set, number]` parts of `cardSlug`, each possibly empty. */
export function cardSlugParts(card: CardLink, language: Language): [name: string, set: string, number: string] {
	const number = /^\d+$/.test(card.localId)
		? card.localId.replace(/^0+(?=\d)/, '')
		: card.localId.replaceAll('!', ' exclamation ').replaceAll('?', ' question ');
	return [slugify(card.name, language), slugify(language === 'ja' ? card.setId : card.setName, language), slugify(number)];
}

/** The card page of a catalogue, percent-encoded for the Japanese names. No `paths.base`, so `goto` and `href` take it as is. */
export function cardPath(language: Language, card: CardLink): string {
	return `${CATALOGUES[language].cardRoute}/${encodeURIComponent(cardSlug(card, language))}`;
}

/** English and French sets use their name, Japanese ones add the set id (`ポケモンジャングル-pmcg2`) since their names repeat. */
export function setSlug(set: Pick<CardSet, 'name' | 'setId'>, language: Language): string {
	return [slugify(set.name, language), language === 'ja' ? slugify(set.setId) : ''].filter(Boolean).join('-');
}

/** `/sets/<slug>` in English, `/france/sets/<slug>` and `/japan/sets/<slug>` in the other catalogues. */
export function setPath(set: Pick<CardSet, 'name' | 'setId'>, catalogue: Catalogue): string {
	return `${catalogue.routeCode ? catalogue.gridRoute : ''}/sets/${encodeURIComponent(setSlug(set, catalogue.language))}`;
}

/** The order a set is printed in: numeric numbers by value, lettered ones (`TG01`, `GG05`) after their prefix, the same order `setLanding` lists. */
const byLocalId = (a: FullCard, b: FullCard) => a.localId.localeCompare(b.localId, 'en', { numeric: true });

/** Sorted once per set and card list, so a card page never re-sorts the catalogue; the list is the memoized one `getCards` returns. */
const setOrders = new WeakMap<FullCard[], Map<string, FullCard[]>>();

/** The cards printed just before and after this one in its set. `cards` may list a card twice, so the set is deduplicated by `cardCode`. */
export function setNeighbours(card: Pick<FullCard, 'cardCode' | 'setId'>, cards: FullCard[]): { next?: FullCard; previous?: FullCard } {
	let orders = setOrders.get(cards);
	if (!orders) setOrders.set(cards, orders = new Map());
	let order = orders.get(card.setId);
	if (!order) {
		const inSet = new Map(cards.filter(other => other.setId === card.setId).map(other => [other.cardCode, other]));
		orders.set(card.setId, order = [...inSet.values()].sort(byLocalId));
	}
	const index = order.findIndex(other => other.cardCode === card.cardCode);
	return index < 0 ? {} : { next: order[index + 1], previous: order[index - 1] };
}

/** A neighbouring card as the card page links it: `name`, printed `number` (`66`, `TG01`) and `path`. */
export interface NeighbourLink {
	name: string;
	number: string;
	path: string;
}

export interface SetNeighbourLinks {
	next?: NeighbourLink;
	previous?: NeighbourLink;
}

export function setNeighbourLinks(language: Language, card: Pick<FullCard, 'cardCode' | 'setId'>, cards: FullCard[]): SetNeighbourLinks {
	const link = (neighbour?: FullCard): NeighbourLink | undefined => neighbour && { name: neighbour.name, number: formatCardNumber(neighbour.localId), path: cardPath(language, neighbour) };
	const { next, previous } = setNeighbours(card, cards);
	return { next: link(next), previous: link(previous) };
}

/** A heuristic, not a parse: a card code contains `_` and a URL starts with `http`. */
export function isCardCode(item: string): boolean {
	if (!item) return false;
	return item.includes('_') && !item.startsWith('http');
}

export function getRepresentativeCardForPokemon(pokemonId: number, allCards: FullCard[], prices: Record<string, PriceData>): FullCard | undefined {
	const filteredCards = allCards.filter(c => c.pokemonNumber === pokemonId);
	if (filteredCards.length === 0) return undefined;

	return [...filteredCards].sort((a, b) => (cardPrice(prices[b.cardCode]) ?? 0) - (cardPrice(prices[a.cardCode]) ?? 0))[0];
}

/**
 * The slice of the catalogue a card page reads: the cards, Pokédex rows and prices of the card's Pokémon, its dex
 * neighbours and two evolution stages either way, plus the page's sibling cards. Sending the whole tables would make the document 11.5 MB.
 */
export function cardPageCatalogue(pokemonNumber: number | undefined, siblings: FullCard[], allCards: FullCard[], pokemons: Pokemon[], prices: Record<string, PriceData>) {
	const ids = new Set<number>();
	if (pokemonNumber) {
		const byId = new Map(pokemons.map(pokemon => [pokemon.id, pokemon]));
		const current = byId.get(pokemonNumber);
		ids.add(pokemonNumber - 1).add(pokemonNumber).add(pokemonNumber + 1);

		const pre = current?.evolves_from;
		if (pre) ids.add(pre);
		const prePre = pre ? byId.get(pre)?.evolves_from : undefined;
		if (prePre) ids.add(prePre);

		for (const evolution of current?.evolves_to ?? []) {
			ids.add(evolution);
			for (const further of byId.get(evolution)?.evolves_to ?? []) ids.add(further);
		}
	}

	const siblingCodes = new Set(siblings.map(card => card.cardCode));
	const cards = allCards.filter(card => siblingCodes.has(card.cardCode) || (card.pokemonNumber !== undefined && ids.has(card.pokemonNumber)));

	return {
		allCards: cards,
		pokemons: pokemons.filter(pokemon => ids.has(pokemon.id)),
		prices: Object.fromEntries(cards.flatMap(card => prices[card.cardCode] ? [[card.cardCode, prices[card.cardCode]]] : [])) as Record<string, PriceData>,
	};
}
