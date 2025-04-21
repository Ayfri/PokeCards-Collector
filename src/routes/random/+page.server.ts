import { getCards } from "$helpers/data";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "../$types";

export const load: PageServerLoad = async ({ fetch }) => {
	const allCards = await getCards();

	redirect(301, `/card/${allCards[Math.floor(Math.random() * allCards.length)].cardCode}/`);
}
