import { error, redirect } from '@sveltejs/kit';
import { cardPath } from '#helpers/card-utils.ts';
import { findCardLinkByCode } from '#helpers/supabase-data.ts';
import type { RequestHandler } from './$types';

/** The card codes that predate the readable URLs: every old link, sitemap entry and share still lands on the card. */
export const GET: RequestHandler = async ({ params }) => {
	const card = await findCardLinkByCode('en', params.code);
	if (!card) error(404, 'Card not found');

	redirect(301, cardPath('en', card));
};
