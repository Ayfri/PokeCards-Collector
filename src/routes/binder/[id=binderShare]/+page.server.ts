import { error } from '@sveltejs/kit';
import { cardPath } from '#helpers/card-utils.ts';
import type { Language } from '#helpers/catalogues.ts';
import { formatDate } from '#helpers/format.ts';
import { ogImage } from '#helpers/og-image.ts';
import { isFrenchCode } from '#helpers/owned-cards.ts';
import { breadcrumbs } from '#helpers/seo.ts';
import { getCardIndex } from '#helpers/supabase-data.ts';
import { getBinderShare } from '#lib/services/binder-shares.ts';
import type { BinderTile, FullCard } from '#lib/types.js';
import type { PageServerLoad } from './$types';

const NONE: ReadonlyMap<string, FullCard> = new Map();

/**
 * A shared binder is rendered from the catalogue: the stored share holds codes only, and each one is resolved here into the few fields a pocket draws,
 * so no catalogue table reaches the document (rule 1). A French code resolves in the French catalogue, any other in the English one and then the
 * Japanese one, the order `owned_cards` uses; the Japanese and French lists are read only when a code needs them.
 * A code no catalogue holds any more keeps its key and draws the placeholder plate, so copying the binder loses nothing.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: share, error: failure } = await getBinderShare(locals.supabase, params.id);
	if (failure) error(500, 'The shared binder could not be loaded. Try again later.');
	if (!share) error(404, 'This shared binder does not exist or was unpublished.');

	const codes = share.pages.flat().filter((code): code is string => code !== null);
	const [english, french] = await Promise.all([
		codes.some(code => !isFrenchCode(code)) ? getCardIndex('en') : NONE,
		codes.some(isFrenchCode) ? getCardIndex('fr') : NONE,
	]);
	const japanese = codes.some(code => !isFrenchCode(code) && !english.has(code)) ? await getCardIndex('ja') : NONE;

	function tileOf(key: string): BinderTile {
		const [language, card]: [Language, FullCard | undefined] = isFrenchCode(key) ? ['fr', french.get(key)] : english.has(key) ? ['en', english.get(key)] : ['ja', japanese.get(key)];
		return card ? { href: cardPath(language, card), image: card.image, key, name: card.name, types: card.types } : { image: '', key, name: 'Card not in the catalogue' };
	}

	const sharedAt = formatDate(share.created_at);
	return {
		breadcrumbs: breadcrumbs({ name: 'Binder', url: '/binder' }, { name: share.name, url: `/binder/${share.id}` }),
		cardCount: codes.length,
		description: `${share.name}, a Pokémon card binder by ${share.username}: ${codes.length} cards on ${share.pages.length} pages, shared on ${sharedAt}.`,
		image: ogImage({ kind: 'page', name: 'binder' }, 'The PokéCards-Collector binder builder, with three of the most valuable cards'),
		isOwner: locals.profile?.username === share.username,
		name: share.name,
		/** A shared binder is a public snapshot, listed with its author's username by the public data API, but not a page to rank. */
		noindex: true,
		pages: share.pages.map(sheet => sheet.map(key => (key === null ? null : tileOf(key)))),
		pocketColumns: share.pocket_columns,
		pocketRows: share.pocket_rows,
		shareId: share.id,
		sharedAt,
		title: `${share.name}, a binder by ${share.username}`,
		username: share.username,
	};
};
