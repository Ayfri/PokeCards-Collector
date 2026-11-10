import { isLanguage } from '#helpers/catalogues.ts';
import { getCardVersions } from '#helpers/supabase-data.ts';
import type { RequestHandler } from './$types';

/** The same card in the other catalogues, for the language switcher of a card that was swapped in the browser without a page load. */
export const GET: RequestHandler = async ({ url }) => {
	const language = url.searchParams.get('language');
	const code = url.searchParams.get('code');

	if (!isLanguage(language)) return Response.json({ error: 'Unknown language' }, { status: 400 });
	if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

	return Response.json(await getCardVersions(language, code), {
		headers: { 'cache-control': 'public, max-age=86400' },
	});
};
