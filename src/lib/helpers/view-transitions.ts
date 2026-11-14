import type { OnNavigate } from '$app/navigation';
import { prefersReducedMotion } from 'svelte/motion';

/** The single `view-transition-name` a card carries while it flies between two places, styled in `app.css`. */
const CARD_NAME = 'card';

/** The first element matching `selector` that is on screen: a card off screen has nowhere to fly from or to. */
function onScreen(selector: string): HTMLElement | undefined {
	return [...document.querySelectorAll<HTMLElement>(selector)].find(element => {
		const rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
	});
}

/**
 * The drawn card (`data-card-image`, set by `CardImage` / `CardPlate`) of the card page at `path`, wherever a page shows it:
 * - inside a link to that page (home, profile, trainers, search, a shared binder);
 * - inside an element carrying `data-card-path`, for a tile whose link does not wrap its image: the stretched link of a grid tile
 *   and of a related print, the menu of a binder pocket.
 * The pathname, the `href`s and `data-card-path` are all percent-encoded `cardPath` values, so they compare as they are.
 */
export function cardTile(path: string): HTMLElement | undefined {
	const value = CSS.escape(path);
	return onScreen(`:is(a[href="${value}"], [data-card-path="${value}"]) [data-card-image]`);
}

/** The big card of a card page, whose `data-card-hero` holds the path of the card it shows. */
export const cardHero = (): HTMLElement | undefined => onScreen('[data-card-hero] [data-card-image]');

const canTransition = () => !!document.startViewTransition && !prefersReducedMotion.current;

/**
 * Runs `update` inside a view transition, flying `from` to the element `to` finds afterwards.
 * The name moves from the old element to the new one inside the update, since two elements sharing it would abort the transition.
 */
export function morphCards(from: HTMLElement | undefined, to: () => HTMLElement | undefined, update: () => Promise<void> | void, types: string[] = []) {
	if (!canTransition()) return void update();

	let card = from;
	card?.style.setProperty('view-transition-name', CARD_NAME);

	const run = async () => {
		await update();
		card?.style.removeProperty('view-transition-name');
		card = from && to();
		card?.style.setProperty('view-transition-name', CARD_NAME);
	};
	/** Browsers without transition types only accept the callback form: an options object there never runs `update`. */
	const transition = document.startViewTransition('types' in ViewTransition.prototype ? { types, update: run } : run);
	const release = () => card?.style.removeProperty('view-transition-name');
	transition.finished.then(release, release);
}

/**
 * The `onNavigate` side of the page transitions: going back plays them in reverse, and the card opened or left flies between pages.
 * - A card opened from a page that draws it flies from there into the big card of its page.
 * - Otherwise the big card of the page left flies to wherever the new page draws it.
 * Query-only navigations (filters, sorting, paging) skip the transition, which would freeze the grid on every change.
 */
export function transitionNavigation(navigation: OnNavigate): Promise<void> | undefined {
	if (!canTransition() || navigation.from?.url.pathname === navigation.to?.url.pathname) return;

	const opened = navigation.to ? cardTile(navigation.to.url.pathname) : undefined;
	/** Read from the big card, not from `navigation.from`: a related print swapped in shows another card than the page was loaded for. */
	const left = document.querySelector<HTMLElement>('[data-card-hero]')?.dataset.cardHero;

	return new Promise(resolve => {
		morphCards(
			opened ?? cardHero(),
			() => opened ? cardHero() : left ? cardTile(left) : undefined,
			async () => {
				resolve();
				await navigation.complete;
			},
			[navigation.type === 'popstate' && navigation.delta < 0 ? 'back' : 'forward']
		);
	});
}
