import {cardSlug, setSlug, SUBTYPE_SECTIONS} from '#helpers/card-utils.ts';
import {RARITY_MAPPING} from '#helpers/rarity.ts';
import {CATALOGUES, type Language, LANGUAGES} from '#helpers/catalogues.ts';
import {envClient} from './cli-config';
import {ownedCardCodes, readAll} from './supabase-sync';
import {EXCLUDED_SERIES} from './tcgdex/excluded';
import {sharedProductCodes, speciesInName} from './tcgdex/mappers';

/**
 * Read-only sanity pass over the live Supabase catalogue. It never writes: each check reports a count and a short
 * sample, so a bad upload shows up before anyone browses into it.
 */

/** A single card above this price is a scraping accident: even the most expensive graded singles trade below it. */
const ABSURD_PRICE = 100_000;
const SAMPLE = 5;

type Severity = 'error' | 'warn' | 'info';

interface Check {
	count: number;
	name: string;
	sample: string[];
	severity: Severity;
}

interface CheckReport {
	checks: Check[];
	errors: number;
	warnings: number;
}

interface CardRow {
	card_code: string;
	card_market_url: string | null;
	image: string | null;
	local_id: string | null;
	name: string;
	pokemon_id: number | null;
	rarity: string | null;
	set_id: string | null;
	set_name: string | null;
	subtype: string | null;
	supertype: string | null;
	tcgdex_id: string | null;
	/** `jp_cards` only. */
	twin_tcgdex_id?: string | null;
}

interface PriceRow {
	[column: string]: string | number | null;
	card_code: string;
}

interface SetRow {
	name: string;
	release_date: string | null;
	series: string | null;
	set_id: string;
	total_cards: number | null;
}

const duplicates = <T>(rows: readonly T[], key: (row: T) => string): string[] => {
	const seen = new Set<string>();
	const twice = new Set<string>();
	for (const row of rows) {
		const value = key(row);
		if (seen.has(value)) twice.add(value); else seen.add(value);
	}
	return [...twice];
};

const subtypes = new Set<string>(SUBTYPE_SECTIONS.map(section => section.subtype));

const priceColumns = (row: PriceRow) => Object.entries(row).filter(([column]) => column !== 'card_code');

export async function checkDatabase(): Promise<CheckReport> {
	const supabase = envClient();
	const checks: Check[] = [];
	const add = (name: string, severity: Severity, values: readonly string[], count = values.length) => {
		checks.push({count, name, sample: values.slice(0, SAMPLE), severity});
	};

	const excluded = new Set<string>(EXCLUDED_SERIES);
	const excludedNames = new Set(['Pokémon TCG Pocket']);
	const known = new Map<string, Language>();
	const shared: string[] = [];
	/** `LANGUAGES` lists English first, so its ids are known when the Japanese twins are checked. */
	const englishIds = new Set<string>();

	for (const lang of LANGUAGES) {
		const tables = CATALOGUES[lang].tables;
		const [cards, prices, sets] = await Promise.all([
			readAll<CardRow>(supabase, tables.cards, `card_code,card_market_url,image,local_id,name,pokemon_id,rarity,set_id,set_name,subtype,supertype,tcgdex_id${lang === 'ja' ? ',twin_tcgdex_id' : ''}`, 'card_code'),
			readAll<PriceRow>(supabase, tables.prices, '*', 'card_code'),
			readAll<SetRow>(supabase, tables.sets, 'name,release_date,series,set_id,total_cards', 'set_id'),
		]);

		const tag = (name: string) => `${lang}: ${name}`;
		const setIds = new Set(sets.map(set => set.set_id));
		const cardCodes = new Set(cards.map(card => card.card_code));
		const pricedCodes = new Set(prices.map(price => price.card_code));
		const heldPerSet = new Map<string, number>();
		if (lang === 'en') for (const card of cards) if (card.tcgdex_id) englishIds.add(card.tcgdex_id);
		for (const card of cards) {
			const first = known.get(card.card_code);
			if (first && first !== lang) shared.push(`${card.card_code} (${first}, ${lang})`);
			known.set(card.card_code, first ?? lang);
			if (card.set_id) heldPerSet.set(card.set_id, (heldPerSet.get(card.set_id) ?? 0) + 1);
		}

		add(tag('rows'), 'info', [`${cards.length} cards, ${prices.length} prices, ${sets.length} sets`], cards.length);
		add(tag('duplicate card_code'), 'error', duplicates(cards, card => card.card_code));
		add(tag('duplicate set_id'), 'error', duplicates(sets, set => set.set_id));
		/** Two cards or sets with one slug would share a public URL, and the page would serve only one of them. */
		add(tag('duplicate card slug'), 'error', duplicates(cards, card => cardSlug({localId: card.local_id ?? '', name: card.name, setId: card.set_id ?? '', setName: card.set_name ?? ''}, lang)));
		add(tag('duplicate set slug'), 'error', duplicates(sets, set => setSlug({name: set.name, setId: set.set_id}, lang)));
		add(tag('prices with no card'), 'error', prices.filter(price => !cardCodes.has(price.card_code)).map(price => price.card_code));
		add(tag('cards in an unknown set'), 'error', cards.filter(card => !card.set_id || !setIds.has(card.set_id)).map(card => card.card_code));
		add(tag('cards from an excluded serie'), 'error', cards.filter(card => card.set_id && excluded.has(card.set_id)).map(card => card.card_code));
		add(tag('sets from an excluded serie'), 'error', sets.filter(set => set.series && excludedNames.has(set.series)).map(set => set.set_id));
		add(tag('sets holding no card'), 'error', sets.filter(set => !heldPerSet.has(set.set_id)).map(set => set.set_id));

		add(tag('cards with no tcgdex_id'), 'warn', cards.filter(card => !card.tcgdex_id).map(card => card.card_code));
		add(tag('cards with no image'), 'warn', cards.filter(card => !card.image).map(card => card.card_code));
		if (lang === 'ja') add(tag('twin_tcgdex_id missing from cards'), 'warn', cards.filter(card => card.twin_tcgdex_id && !englishIds.has(card.twin_tcgdex_id)).map(card => `${card.card_code} -> ${card.twin_tcgdex_id}`));
		add(tag('cards with no name'), 'error', cards.filter(card => !card.name).map(card => card.card_code));
		add(tag('cards with no rarity'), 'warn', cards.filter(card => !card.rarity).map(card => card.card_code));
		add(tag('rarities with no tier in RARITY_TIERS'), 'error', [...new Set(cards.flatMap(card => card.rarity && !(card.rarity.toLowerCase() in RARITY_MAPPING) ? [card.rarity] : []))]);
		add(tag('Pokémon cards with no species'), 'warn', cards.filter(card => card.supertype === 'Pokémon' && card.pokemon_id === null).map(card => `${card.card_code} ${card.name}`));
		add(tag('Trainer and Energy cards with no subtype'), 'warn', cards.filter(card => (card.supertype === 'Trainer' || card.supertype === 'Energy') && !card.subtype).map(card => `${card.card_code} ${card.name}`));
		add(tag('subtypes outside SUBTYPE_SECTIONS'), 'warn', [...new Set(cards.flatMap(card => card.subtype && !subtypes.has(card.subtype) ? [card.subtype] : []))]);
		add(tag('pokemon_id out of the dex range'), 'error', cards.filter(card => card.pokemon_id !== null && (card.pokemon_id < 1 || card.pokemon_id > 1100)).map(card => `${card.card_code} (${card.pokemon_id})`));
		if (lang === 'en') {
			add(tag('pokemon_id the card name does not spell'), 'warn', cards.filter(card => {
				const named = card.pokemon_id !== null ? speciesInName(card.name) : [];
				return named.length > 0 && !named.includes(card.pokemon_id!);
			}).map(card => `${card.card_code} ${card.name} (${card.pokemon_id})`));
		}
		add(tag('Cardmarket products shared by differently named cards'), 'error', [...sharedProductCodes(cards.map(card => ({cardCode: card.card_code, cardMarketUrl: card.card_market_url ?? '', name: card.name})))]);

		add(tag('negative prices'), 'error', prices.filter(price => priceColumns(price).some(([, value]) => typeof value === 'number' && value < 0)).map(price => price.card_code));
		add(tag(`prices above ${ABSURD_PRICE} €`), 'error', prices.filter(price => priceColumns(price).some(([, value]) => typeof value === 'number' && value > ABSURD_PRICE)).map(price => price.card_code));
		add(tag('price rows with every column null'), 'warn', prices.filter(price => priceColumns(price).every(([, value]) => value === null)).map(price => price.card_code));
		add(tag('unpriced cards'), 'info', cards.filter(card => !pricedCodes.has(card.card_code)).map(card => card.card_code));

		add(tag('sets with no release date'), 'warn', sets.filter(set => !set.release_date).map(set => set.set_id));
		add(tag('sets holding more cards than total_cards'), 'warn', sets.filter(set => set.total_cards !== null && (heldPerSet.get(set.set_id) ?? 0) > set.total_cards).map(set => set.set_id));
	}

	/** Only a warning: 19 legacy Japanese codes (`pokemon_6_sv3_125`) already match English ones, and owned rows keep them frozen. */
	add('card_code in several catalogues', 'warn', shared);

	/** Only a warning, and the rows are kept on purpose: an owned code no table carries renders again once TCGdex fills the set in. */
	add('owned codes resolving to no card', 'warn', [...await ownedCardCodes(supabase)].filter(code => !known.has(code)));

	return {
		checks,
		errors: checks.filter(check => check.severity === 'error' && check.count > 0).length,
		warnings: checks.filter(check => check.severity === 'warn' && check.count > 0).length,
	};
}
