import type { OnNavigate } from '@sveltejs/kit';

/** The single `view-transition-name` a card carries while it flies between two places, styled in `app.css`. */
const CARD_NAME = 'card';

const isOnScreen = (element: Element) => {
	const rect = element.getBoundingClientRect();
	return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
};

/**
 * First on-screen card image (`data-card-code`, set by `CardImage` / `CardPlate`) matching `codes`, in priority order.
 * A detail page's big card (`data-card-hero`) wins over a tile of the same card in its evolution chain or related cards.
 */
function findCard(codes: (string | undefined)[]): HTMLElement | undefined {
	for (const code of codes) {
		if (!code) continue;
		const value = CSS.escape(code);
		const hero = document.querySelector<HTMLElement>(`[data-card-hero="${value}"] [data-card-code]`);
		if (hero && isOnScreen(hero)) return hero;
		const tile = [...document.querySelectorAll<HTMLElement>(`[data-card-code="${value}"]`)].find(isOnScreen);
		if (tile) return tile;
	}
}

const canTransition = () => !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs `update` inside a view transition, flying the first card of `codes` found on screen to the first one found afterwards.
 * The name moves from the old element to the new one inside the update, since two elements sharing it would abort the transition.
 */
export function morphCards(codes: (string | undefined)[], update: () => Promise<void> | void, types: string[] = []) {
	if (!canTransition()) return void update();

	let card = findCard(codes);
	card?.style.setProperty('view-transition-name', CARD_NAME);

	const run = async () => {
		await update();
		card?.style.removeProperty('view-transition-name');
		card = findCard(codes);
		card?.style.setProperty('view-transition-name', CARD_NAME);
	};
	/** Browsers without transition types only take the callback form, an options object there would never run `update`. */
	const transition = document.startViewTransition('types' in ViewTransition.prototype ? { types, update: run } : run);
	const release = () => card?.style.removeProperty('view-transition-name');
	transition.finished.then(release, release);
}

/**
 * The `onNavigate` side of the page transitions: history back plays them in reverse, and the card being opened or left flies between pages.
 * Query-only navigations (filters, sorting, paging) stay instant, a transition would freeze the grid on every change.
 */
export function transitionNavigation(navigation: OnNavigate): Promise<void> | undefined {
	if (!canTransition() || navigation.from?.url.pathname === navigation.to?.url.pathname) return;

	return new Promise(resolve => {
		morphCards(
			[navigation.to?.params?.cardCode, navigation.from?.params?.cardCode],
			async () => {
				resolve();
				await navigation.complete;
			},
			[(navigation.delta ?? 0) < 0 ? 'back' : 'forward']
		);
	});
}
