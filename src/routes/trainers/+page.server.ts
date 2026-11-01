import type { PageServerLoad } from './$types';
import { getCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { cardGroupKey, cardGroupName, cardPrice, SUBTYPE_SECTIONS } from '#helpers/card-utils.ts';
import type { Card, Set } from '#lib/types.js';

/**
 * What one tile needs. `plate` is what the placeholder of a missing scan reads, so the cards and prices stay on the server: the kind and
 * types on every tile, for a scan that turns out to 404, and the printed details plus `set` only on the few tiles with no scan at all.
 */
export interface TrainerGroupEntry {
	cardCode: string;
	cardCount: number;
	/** Raw TCGdex image base of the group's most valuable print that has a scan, or of its most valuable print when none has. */
	image: string;
	name: string;
	plate: Pick<Card, 'subtype' | 'supertype' | 'types'> & Partial<Pick<Card, 'artImage' | 'artist' | 'artSource' | 'localId' | 'rarity'>>;
	set?: Pick<Set, 'name' | 'printedTotal' | 'symbol'>;
}

export interface TrainerSection {
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

export const load: PageServerLoad = async () => {
	const [allCards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);

	/** One pass over the catalogue, keeping per group its tile print, its size and how its prints are subtyped. A scanned print beats a pricier one with no scan. */
	const groups = new Map<string, { card: Card; count: number; price: number; subtypes: Map<string, number> }>();
	for (const card of allCards) {
		if ((card.supertype !== 'Trainer' && card.supertype !== 'Energy') || !card.setName) continue;

		const key = cardGroupKey(card);
		const price = cardPrice(prices[card.cardCode]) ?? 0;
		let group = groups.get(key);
		if (!group) {
			group = { card, count: 0, price, subtypes: new Map() };
			groups.set(key, group);
		}

		group.count++;
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
			cardCount: group.count,
			image: card.image,
			name: cardGroupName(card.name),
			plate: {
				subtype,
				supertype: card.supertype,
				types: card.types,
				...(!card.image && { artist: card.artist, localId: card.localId, rarity: card.rarity, ...(card.artImage && { artImage: card.artImage, artSource: card.artSource }) }),
			},
			...(!card.image && { set: setsById.get(card.setId) }),
		});
		bySection.set(label, entries);
	}

	const sections: TrainerSection[] = SECTION_ORDER
		.filter(label => bySection.has(label))
		.map(label => ({ groups: bySection.get(label)!.sort((a, b) => a.name.localeCompare(b.name)), label }));

	const first = sections.flatMap(section => section.groups).slice(0, 50);

	return {
		breadcrumbs: breadcrumbs({ name: 'Trainers & Energy', url: '/trainers' }),
		description: `The ${groups.size} Trainer and Energy cards of the Pokémon TCG, each with all its prints grouped together: Supporters, Items, Stadiums, Tools and Energy. Open any one to compare its prints and prices.`,
		keywords: ['Trainer cards', 'Energy cards', 'Pokémon Supporter cards', 'Pokémon Item cards', 'Pokémon Stadium cards', 'all Trainer cards'],
		schemas: [{
			'@type': 'ItemList',
			itemListElement: first.map((entry, index) => ({
				'@type': 'ListItem',
				name: entry.name,
				position: index + 1,
				url: `/card/${entry.cardCode}`,
			})),
			name: 'Trainer and Energy cards of the Pokémon TCG',
			numberOfItems: groups.size,
		}],
		sections,
		title: 'All Trainer and Energy Cards',
		type: 'CollectionPage' as const,
	};
};
