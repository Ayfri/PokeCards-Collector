import type { OnNavigate } from '$app/navigation';
import { prefersReducedMotion } from 'svelte/motion';

/** The single `view-transition-name` a card carries while it flies between two places, styled in `app.css`. */
const CARD_NAME = 'card';

/**
 * The first element matching `selector` that is on screen. With `near`, the closest one within a screen above or below stands in when none is:
 * a card lands on a tile just past the fold by flying out towards it. Further away it has nowhere to fly.
 */
function onScreen(selector: string, near = false): HTMLElement | undefined {
	let closest: HTMLElement | undefined;
	let reach = near ? window.innerHeight : 0;
	for (const element of document.querySelectorAll<HTMLElement>(selector)) {
		const rect = element.getBoundingClientRect();
		const distance = Math.max(0, -rect.bottom, rect.top - window.innerHeight);
		if (!rect.width || distance > reach) continue;
		if (!distance) return element;
		closest = element;
		reach = distance - 1;
	}
	return closest;
}

/**
 * The drawn card (`data-card-image`, set by `CardImage` / `CardPlate`) of the card page at `path`, wherever a page shows it:
 * - inside a link to that page (home, profile, trainers, search, a shared binder);
 * - inside an element carrying `data-card-path`, for a tile whose link does not wrap its image: the stretched link of a grid tile
 *   and of a related print, the menu of a binder pocket.
 * The pathname, the `href`s and `data-card-path` are all percent-encoded `cardPath` values, so they compare as they are.
 */
export function cardTile(path: string, near = false): HTMLElement | undefined {
	const value = CSS.escape(path);
	return onScreen(`:is(a[href="${value}"], [data-card-path="${value}"]) [data-card-image]`, near);
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
 * - Otherwise the big card of the page left flies to wherever the new page draws it (a set, an artist's cards, a collection),
 *   on screen or just past the fold.
 * - From a card page to another one that does not draw it (a language twin, an evolution), the big card turns into the new one in place.
 *   A link carrying `data-card-step` (`prev` / `next`: the cards of the set, the Pokédex neighbours) adds the `card-prev` / `card-next` type,
 *   which `app.css` plays as a sideways deal. Going back deals the other way when the page left links back with the opposite step:
 *   always between two cards of a set, and between Pokédex neighbours only when the card left is the one their link points to.
 * Query-only navigations (filters, sorting, paging) skip the transition, which would freeze the grid on every change.
 */
export function transitionNavigation(navigation: OnNavigate): Promise<void> | undefined {
	if (!canTransition() || !navigation.to) return;

	const destination = navigation.to.url.pathname;
	/** Read from the big card, not from `navigation.from`: a related print swapped in shows another card than the page was loaded for. */
	const left = document.querySelector<HTMLElement>('[data-card-hero]')?.dataset.cardHero;
	if ((left ?? navigation.from?.url.pathname) === destination) return;

	/** The clicked link tells the step, since a set neighbour and a Pokédex neighbour can link to the same card with opposite steps. Other navigations have no link, so the page is searched. */
	const stepLink = navigation.type === 'link'
		? (navigation.event.target as Element).closest<HTMLElement>('a')
		: document.querySelector<HTMLElement>(`a[href="${CSS.escape(destination)}"][data-card-step]`);
	const step = stepLink?.dataset.cardStep;
	/** A step always deals the big card, even to a card the page also lists. Elsewhere on a card page only a tile on screen counts. */
	const opened = step ? undefined : cardTile(destination, !left);

	return new Promise(resolve => {
		morphCards(
			opened ?? cardHero(),
			() => (!opened && left && cardTile(left, true)) || cardHero(),
			async () => {
				resolve();
				await navigation.complete;
			},
			[navigation.type === 'popstate' && navigation.delta < 0 ? 'back' : 'forward', ...(step ? [`card-${step}`] : [])]
		);
	});
}
