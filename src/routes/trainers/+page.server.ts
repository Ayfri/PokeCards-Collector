import type { PageServerLoad } from './$types';
import { ogImage } from '#helpers/og-image.ts';
import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { BASE_URL } from '#src/constants.ts';
import { cardGroupKey, cardGroupName, cardPath, cardPrice, memoizedOn, SUBTYPE_SECTIONS } from '#helpers/card-utils.ts';
import type { Card, FullCard, PriceData, Set } from '#lib/types.js';

/**
 * What one tile needs. `plate` is what the placeholder of a missing scan reads, so the cards and prices stay on the server: the kind and
 * types on every tile, for a scan that turns out to 404, and the printed details plus `set` only on the few tiles with no scan at all.
 */
export interface TrainerGroupEntry {
	cardCode: string;
	cardCount: number;
	/** Every print's code when the group has several, so the browser counts the owned ones from the `collection` store; a one-print group is its own `cardCode`. */
	codes?: string[];
	/** Raw TCGdex image base of the group's most valuable print that has a scan, or of its most valuable print when none has. */
	image: string;
	name: string;
	path: string;
	plate: Pick<Card, 'subtype' | 'supertype' | 'types'> & Partial<Pick<Card, 'artImage' | 'artist' | 'artSource' | 'localId' | 'rarity'>>;
	/** Cardmarket price in EUR of the group's most valuable print, which is not always the print the tile shows. 0 when no print is priced. */
	price: number;
	set?: Pick<Set, 'name' | 'printedTotal' | 'symbol'>;
}

interface TrainerSection {
	groups: TrainerGroupEntry[];
	label: string;
}

/** The known sections in display order, with the catch-all of each supertype right after its own sections. */
const SECTION_ORDER = [
	...SUBTYPE_SECTIONS.filter(section => section.supertype === 'Trainer').map(section => section.label),
	'Other Trainers',
	...SUBTYPE_SECTIONS.filter(section => section.supertype === 'Energy').map(section => section.label),
	'Other Energy',
];

/** Keyed on the memoized tables: the grouping of every Trainer and Energy card runs once per refreshed table instead of once per request. */
const aggregates = new WeakMap<object, unknown>();

const aggregateTrainers = (allCards: FullCard[], prices: Record<string, PriceData>, sets: Set[]) => memoizedOn(aggregates, [allCards, prices, sets], (): { groupCount: number; sections: TrainerSection[] } => {
	/** One pass over the catalogue, keeping per group its tile print, its size and how its prints are subtyped. A scanned print beats a pricier one with no scan. */
	const groups = new Map<string, { card: Card; codes: string[]; price: number; subtypes: Map<string, number>; topPrice: number }>();
	for (const card of allCards) {
		if ((card.supertype !== 'Trainer' && card.supertype !== 'Energy') || !card.setName) continue;

		const key = cardGroupKey(card);
		const price = cardPrice(prices[card.cardCode]) ?? 0;
		let group = groups.get(key);
		if (!group) {
			group = { card, codes: [], price, subtypes: new Map(), topPrice: 0 };
			groups.set(key, group);
		}

		group.codes.push(card.cardCode);
		if (price > group.topPrice) group.topPrice = price;
		if (!!card.image !== !!group.card.image ? !!card.image : price > group.price) {
			group.card = card;
			group.price = price;
		}
		if (card.subtype) group.subtypes.set(card.subtype, (group.subtypes.get(card.subtype) ?? 0) + 1);
	}

	const setsById = new Map(sets.map(({ name, printedTotal, setId, symbol }) => [setId, { name, printedTotal, symbol }]));
	const bySection = new Map<string, TrainerGroupEntry[]>();
	for (const group of groups.values()) {
		const { card } = group;
		const [subtype] = [...group.subtypes].sort((a, b) => b[1] - a[1])[0] ?? [];
		const label = SUBTYPE_SECTIONS.find(section => section.supertype === card.supertype && section.subtype === subtype)?.label
			?? (card.supertype === 'Trainer' ? 'Other Trainers' : 'Other Energy');

		const entries = bySection.get(label) ?? [];
		entries.push({
			cardCode: card.cardCode,
			cardCount: group.codes.length,
			...(group.codes.length > 1 && { codes: group.codes }),
			image: card.image,
			name: cardGroupName(card.name),
			path: cardPath('en', card),
			plate: {
				subtype,
				supertype: card.supertype,
				types: card.types,
				...(!card.image && { artist: card.artist, localId: card.localId, rarity: card.rarity, ...(card.artImage && { artImage: card.artImage, artSource: card.artSource }) }),
			},
			price: Math.round(group.topPrice * 100) / 100,
			...(!card.image && { set: setsById.get(card.setId) }),
		});
		bySection.set(label, entries);
	}

	const sections: TrainerSection[] = SECTION_ORDER
		.filter(label => bySection.has(label))
		.map(label => ({ groups: bySection.get(label)!.sort((a, b) => a.name.localeCompare(b.name)), label }));

	return { groupCount: groups.size, sections };
});

export const load: PageServerLoad = async ({ locals }) => {
	const [allCards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);
	const { groupCount, sections: allSections } = aggregateTrainers(allCards, prices, sets);
	const first = allSections.flatMap(section => section.groups).slice(0, 50);

	/** Only a logged-in visitor has a collection to count, so everyone else skips the ~77 kB of print codes. The memoized aggregate keeps them. */
	const sections = locals.user ? allSections : allSections.map(section => ({ ...section, groups: section.groups.map(({ codes: _codes, ...group }) => group) }));

	return {
		breadcrumbs: breadcrumbs({ name: 'Trainers & Energy', url: '/trainers' }),
		description: `The ${groupCount} Trainer and Energy cards of the Pokémon TCG, each with all its prints grouped together: Supporters, Items, Stadiums, Tools and Energy. Open any one to compare its prints and prices.`,
		image: ogImage({ kind: 'page', name: 'trainers' }, 'Every Trainer and Energy card on PokéCards-Collector, with the most valuable ones'),
		keywords: ['Trainer cards', 'Energy cards', 'Pokémon Supporter cards', 'Pokémon Item cards', 'Pokémon Stadium cards', 'all Trainer cards'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: first.map((entry, index) => ({
				'@type': 'ListItem',
				name: entry.name,
				position: index + 1,
				url: `${BASE_URL}${entry.path}`,
			})),
			name: 'Trainer and Energy cards of the Pokémon TCG',
			numberOfItems: groupCount,
		}],
		sections,
		title: 'All Trainer and Energy Cards',
		type: 'CollectionPage' as const,
	};
};
