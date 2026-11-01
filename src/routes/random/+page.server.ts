import { cardPath } from "#helpers/card-utils.ts";
import { getRandomCard } from "#helpers/supabase-data.ts";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "../$types";

export const load: PageServerLoad = async () => {
	const card = await getRandomCard();
	if (!card) error(404, 'No card to pick from');

	redirect(302, cardPath('en', card));
}
