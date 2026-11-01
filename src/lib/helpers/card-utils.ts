import type { Card, FullCard, Pokemon, PriceData } from '#lib/types.js';

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
 */
/**
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
