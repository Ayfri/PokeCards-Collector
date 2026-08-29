import { getRandomCardCode } from "$helpers/supabase-data";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "../$types";

export const load: PageServerLoad = async () => {
	const cardCode = await getRandomCardCode();
	if (!cardCode) error(404, 'No card to pick from');

	redirect(302, `/card/${cardCode}/`);
}
