import { read } from '$app/server';
import { env } from 'cloudflare:workers';
import { render as renderComponent } from 'svelte/server';
import { render, type ImageSource } from 'takumi-js';
import { container, googleFonts, image, text, type FontSubset, type Node } from 'takumi-js/helpers';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import CircleEuro from '@lucide/svelte/icons/circle-euro';
import Flame from '@lucide/svelte/icons/flame';
import Gem from '@lucide/svelte/icons/gem';
import Heart from '@lucide/svelte/icons/heart';
import Layers from '@lucide/svelte/icons/layers';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Library from '@lucide/svelte/icons/library';
import Lock from '@lucide/svelte/icons/lock';
import Paintbrush from '@lucide/svelte/icons/paintbrush';
import PawPrint from '@lucide/svelte/icons/paw-print';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Users from '@lucide/svelte/icons/users';
import Flag from '#components/Flag.svelte';
import appCss from '#src/app.css?raw';
import logoUrl from '#src/assets/pokecards-collector.png';
import clashBold from '#src/fonts/ClashDisplay-Bold.ttf';
import clashMedium from '#src/fonts/ClashDisplay-Medium.ttf';
import clashSemibold from '#src/fonts/ClashDisplay-Semibold.ttf';
import colorsCss from '#src/styles/colors.css?raw';
import { BASE_URL, CARDTRADER_IMAGES, POKEMONS_COUNT, SITE_NAME } from '#src/constants.ts';
import { processCardImage, type ImageQuality } from '#helpers/card-images.ts';
import { cardPrice, formatCardNumber, setCardCount } from '#helpers/card-utils.ts';
import { CATALOGUES, LANGUAGES, type Language } from '#helpers/catalogues.ts';
import { formatEuros } from '#helpers/format.ts';
import { formatOgEuros, OG_HEIGHT, OG_WIDTH, ogPrice, setValue, type OgPage, type OgTarget, type OgUserKind } from '#helpers/og-image.ts';
import { ownedTotals } from '#helpers/owned-cards.ts';
import { RARITY_SYMBOLS, type RarityTone } from '#helpers/rarity-symbols.ts';
import { SET_IMAGE_DIR } from '#helpers/set-images.ts';
import { countCards, getCardDetails, getCardPrice, getCards, getCatalogue, getOwnedCards, getPrices, getSets } from '#helpers/supabase-data.ts';
import { RARITY_SHAPES, TYPE_SYMBOLS } from '#helpers/tcg-symbols.ts';
import { getProfileByUsername } from '#lib/services/profiles.ts';
import { supabase } from '#lib/supabase.ts';
import type { Card, PriceData, Set } from '#lib/types.js';

/**
 * Share previews are seen ~500px wide in Discord, X or iMessage, so every image is one focal point at sizes that survive a 2.4x
 * shrink: a 72-96px title, one gold hero number, at most three 32px facts drawn as icon + text, and the scan or three cards on the
 * right. The site shows through its details only: Clash Display, the `@theme` gold and grays, the logo watermark of the root layout,
 * and the real flag, rarity, energy and set symbols.
 */

/** The `@theme` colors of `app.css` and the energy colors of `colors.css`, read from the files so the images follow a palette change. */
const COLORS: Record<string, string> = Object.fromEntries(
	[...`${appCss}\n${colorsCss}`.matchAll(/--(?:color-)?([\w-]+):\s*(#[\da-f]{6})\b/gi)].map(([, name, value]) => [name, value]),
);
const color = (name: string): string => COLORS[name] ?? COLORS.colorless;

/** Tailwind's own v4 shades `RARITY_TONES` and the Card.dle tiles use, which `@theme` does not redeclare. */
const GREEN_600 = '#00a63e';
const RED_600 = '#e7000b';
const RARITY_FILLS: Record<RarityTone, string> = { gold: color('gold-400'), ink: color('gray-200'), pink: '#fb64b6', silver: '#cad5e2' };

/** TCGdex scans are 600x825. */
const CARD_RATIO = 825 / 600;
const LEFT = 64;

const FONT_FAMILIES = ['Clash Display', 'Noto Sans JP'];

/** Keyed, so the renderer registers each face once per isolate and never calls `data` again. */
const CLASH_FONTS = ([[500, clashMedium], [600, clashSemibold], [700, clashBold]] as const).map(([weight, url]) => ({
	data: () => read(url).arrayBuffer(),
	key: `clash-${weight}`,
	name: 'Clash Display',
	weight,
}));

let fallbackFonts: Promise<FontSubset[]> | undefined;

/** Google Fonts and the scan downloads each give up after this long, so a slow host cannot hold every render. */
const FONT_TIMEOUT_MS = 5000;
const IMAGE_TIMEOUT_MS = 5000;

/** What one render collects while its layout is built: the scans it fetched itself, and whether every image it needs arrived. */
interface RenderState {
	complete: boolean;
	sources: ImageSource[];
}

/**
 * Clash Display only covers Latin, so Japanese names and symbols such as ♀ or ☆ fall back to Noto Sans JP. The CSS is read once per
 * isolate and lists ~120 `unicode-range` subsets, of which a render downloads only those its text uses. A failed or timed out read
 * renders without the fallback and retries next time.
 */
function notoFonts(): Promise<FontSubset[]> {
	return fallbackFonts ??= googleFonts({ families: [{ name: 'Noto Sans JP', weight: 700 }], timeout: FONT_TIMEOUT_MS }).catch((error: unknown) => {
		console.error('OG fallback font unavailable:', error);
		fallbackFonts = undefined;
		return [];
	});
}

let logoBytes: Promise<ArrayBuffer> | undefined;

/** The logo is a Vite asset, so its `src` is a site-relative URL the renderer cannot fetch: its bytes are handed over under that same `src`. */
const logoSource = {
	cache: 'auto' as const,
	/** A failed read is dropped, like `notoFonts`, so one bad read never breaks every later render of the isolate. */
	data: () => logoBytes ??= read(logoUrl).arrayBuffer().catch((error: unknown) => {
		logoBytes = undefined;
		throw error;
	}),
	src: logoUrl,
};

const MIRRORED_PREFIX = `${BASE_URL}/${SET_IMAGE_DIR}/`;

/**
 * The renderer only fetches absolute URLs, so a mirrored logo (`/set-images/...`) is given on the site origin, and `fetchImage` reads it from the
 * assets binding instead of the Worker requesting its own public URL. Without the binding (dev) the plain `fetch` still tries that URL.
 */
const absoluteImage = (src: string) => src.startsWith('/') ? new URL(src, BASE_URL).href : src;

const formatCount = (value: number) => value.toLocaleString('en-US');

/** Clash Display Bold runs ~0.62em per character (measured on "Archéduc-ex"), ~0.8em per capital ("30th CELEBRATION" overflowed at 0.62), a CJK glyph a full em. */
const ems = (value: string) => [...value].reduce((sum, char) => sum + (char.codePointAt(0)! >= 0x2e80 ? 1 : /[A-Z]/.test(char) ? 0.8 : 0.62), 0);

/** A component's SVG as an image: Svelte's hydration comments go, and the namespace inline markup omits is added for a standalone file. */
function svg(markup: string, width: number, height = width): Node {
	const clean = markup.replace(/<!--[\s\S]*?-->/g, '');
	const file = clean.includes('xmlns=') ? clean : clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
	return image({ height, src: `data:image/svg+xml;utf8,${encodeURIComponent(file)}`, width });
}

type LucideIcon = typeof Library;

/** The same Lucide components the pages draw, rendered to SVG on the server. */
const icon = (Icon: LucideIcon, size: number, stroke = color('gold-400')): Node => svg(renderComponent(Icon, { props: { color: stroke, size, strokeWidth: 2.25 } }).body, size);

const flag = (language: Language, height = 32): Node => container({
	tw: 'flex overflow-hidden rounded-[4px]',
	style: { boxShadow: '0 0 0 1.5px rgb(255 255 255 / 0.25)' },
	children: [svg(renderComponent(Flag, { props: { language } }).body, Math.round(height * 1.5), height)],
});

/**
 * `RaritySymbol` and `TypeSymbol` color their SVG through Tailwind classes and CSS variables a standalone file cannot resolve, so they
 * are drawn here from the same shape tables, with the fills the classes resolve to.
 */
function raritySymbol(rarity: string, size: number): Node | null {
	const spec = RARITY_SYMBOLS[rarity];
	if (!spec) return null;
	const width = spec.count * 112 - 12;
	const glyphs = Array.from({ length: spec.count }, (_, index) => `<path d="${RARITY_SHAPES[spec.shape]}" fill="${RARITY_FILLS[spec.tone]}" transform="translate(${index * 112} 0)"/>`).join('');
	return svg(`<svg viewBox="0 0 ${width} 100">${glyphs}</svg>`, Math.round(size * width / 100), size);
}

function typeSymbol(type: string, size: number): Node {
	const key = type.trim().toLowerCase();
	const glyph = TYPE_SYMBOLS[key];
	return svg(
		`<svg viewBox="0 0 100 100"><defs><radialGradient id="t" cx=".3" cy=".25" r=".85"><stop offset="0" stop-color="${color(key)}"/><stop offset="1" stop-color="${color(`${key}2`)}"/></radialGradient></defs>`
		+ `<circle cx="50" cy="50" r="47.5" fill="url(#t)" stroke="#fff" stroke-opacity="0.5" stroke-width="5"/>`
		+ (glyph ? `<path d="${glyph}" fill="#0a0a0a" transform="translate(13 13) scale(0.74)"/>` : '')
		+ '</svg>',
		size,
	);
}

/**
 * The title at the largest size that fits `width` on one line, 96px at most, else on two lines at 56-80px, smaller only when its
 * longest word alone would not fit a line ("CELEBRATION" was cut at the two-line size).
 */
function title(value: string, width: number, max = 96): Node {
	const oneLine = Math.floor(width / ems(value));
	const longestWord = Math.max(...value.split(/\s+/).map(ems));
	const size = oneLine >= 72 ? Math.min(oneLine, max) : Math.max(40, Math.min(80, Math.floor(oneLine * 1.9), Math.floor(width / longestWord)));
	return text({ text: value, tw: 'font-bold leading-[1.05] text-white', style: { fontSize: size, lineClamp: 2, textOverflow: 'ellipsis' } });
}

/** A secondary fact: its symbols, then one line of text. */
function fact(symbols: Node[], label: string): Node {
	return container({
		tw: `flex items-center gap-3 text-[32px] font-medium text-[${color('gray-200')}]`,
		children: [...symbols, text({ text: label, tw: 'min-w-0', style: { lineClamp: 1, textOverflow: 'ellipsis' } })],
	});
}

/** The gold hero number, 80px unless the column is too narrow for it: Clash Display digits run ~0.56em ("5,477.52 €" wrapped at 80px in 416px). */
const hero = (value: string, width: number): Node => text({
	text: value,
	tw: `mt-2 font-bold leading-none whitespace-nowrap text-[${color('gold-400')}]`,
	style: { fontSize: Math.min(80, Math.floor(width / ([...value].length * 0.56))) },
});

const pitch = (value: string): Node => text({ text: value, tw: `text-[34px] font-medium leading-[1.25] text-[${color('gray-300')}]`, style: { lineClamp: 2 } });

/**
 * The canvas every image shares: the page black, the root layout's logo watermark, the brand in the top left corner and the domain
 * in the bottom left, with `content` between them and `visual` drawn in the width left on the right side.
 */
function canvas(width: number, content: Node[], visual: Node | ((room: number) => Node)): Node {
	const room = OG_WIDTH - width - 48;
	return container({
		tw: 'relative flex h-full w-full bg-black text-white',
		style: { fontFamily: FONT_FAMILIES.map(name => `'${name}'`).join(', ') },
		children: [
			image({ src: logoUrl, width: 560, height: 504, style: { filter: 'grayscale(100%)', left: 320, opacity: 0.05, position: 'absolute', top: 100 } }),
			container({
				tw: 'flex h-full shrink-0 flex-col justify-between py-[44px]',
				style: { paddingLeft: LEFT, width },
				children: [
					container({ tw: 'flex items-center gap-3', children: [image({ src: logoUrl, width: 50, height: 45 }), text({ text: SITE_NAME, tw: `text-[28px] font-semibold text-[${color('gray-300')}]` })] }),
					container({ tw: 'flex flex-col gap-5', children: content }),
					text({ text: new URL(BASE_URL).host, tw: `text-[24px] font-medium text-[${color('gray-500')}]` }),
				],
			}),
			container({ tw: 'flex flex-1 items-center justify-center pr-[48px]', children: [typeof visual === 'function' ? visual(room) : visual] }),
		],
	});
}

const cardShadow = '0 24px 48px rgb(0 0 0 / 0.7)';

/** A straight scan with the site's card radius, `rounded-xl` scaled to the card. */
const scan = (src: string, height: number): Node => image({
	src,
	width: Math.round(height / CARD_RATIO),
	height,
	style: { borderRadius: Math.round(height * 0.035), boxShadow: cardShadow },
});

/** Three cards side by side, straight, overlapping a little with the middle one on top, as large as `room` allows. */
function trio(scans: string[], room: number): Node {
	const overlap = 34;
	const width = Math.min(300, Math.floor((room - 16 + overlap * (scans.length - 1)) / scans.length));
	const height = Math.round(width * CARD_RATIO);
	const step = width - overlap;
	const order = scans.length === 3 ? [0, 2, 1] : scans.map((_, index) => index);
	return container({
		tw: 'relative flex',
		style: { height, width: width + step * (scans.length - 1) },
		children: order.map(index => container({ tw: 'absolute flex', style: { left: index * step, top: 0 }, children: [scan(scans[index], height)] })),
	});
}

const logoVisual = (): Node => image({ src: logoUrl, width: 330, height: 297, style: { opacity: 0.9 } });

interface Ranked {
	card: Card;
	/** The catalogue read stamps no `language` on its cards, only the owned-card pages do. */
	language?: Language;
	price: number;
}

/**
 * A Japanese card with no scan of its own shows its English twin's, which prints another number (Nidoran♀ #20/51 under a scan
 * reading 40/116), so its number is left out rather than contradict the image.
 */
const borrowsScan = (card: Card, language = card.language): boolean => language === 'ja' && card.image.startsWith('https://assets.tcgdex.net/en/');

/**
 * The card hero is drawn ~393x540 and the hidden-price card 500 px high, so they take `high` (TCGdex 600 px). The trio of the set, user and page
 * images is drawn at most 300 px wide, so it takes `low` (TCGdex 245 px, CardTrader `show_` 500 px). A CardTrader scan is `low` everywhere,
 * since its 868 px original costs ~2 MB decoded in a 128 MB isolate.
 */
const ogScan = (image: string, quality: ImageQuality): string => processCardImage(image, image.startsWith(CARDTRADER_IMAGES) ? 'low' : quality);

/** The cards that have a scan, most valuable first. */
function ranked(cards: Card[], prices: Record<string, PriceData>, language?: Language): Ranked[] {
	return cards
		.filter(card => card.image)
		.map(card => ({ card, language, price: cardPrice(prices[card.cardCode]) ?? 0 }))
		.sort((a, b) => b.price - a.price);
}

/**
 * A scan from the CDN. A 4xx is a scan that does not exist (`null`); a network error, a timeout or a 5xx is retried once, then `undefined`.
 * TCGdex drops the odd request under a burst (5 of 5 fan scans once failed locally).
 */
async function fetchScan(url: string): Promise<Response | null | undefined> {
	const attempt = async () => {
		const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
		if (response.ok) return response;
		await response.body?.cancel();
		if (response.status >= 500) throw new Error(`${response.status} for ${url}`);
		return null;
	};
	return attempt().catch(attempt).catch(() => undefined);
}

/**
 * The scans of the first `count` entries the CDN has, at the `low` size, handed to the renderer under their URL with their bytes: one GET each
 * and no second download inside the renderer. A card can carry an `image` TCGdex has no file for (the French 30th Celebration Mews), which left an
 * empty card in the image, so twice as many candidates are requested in parallel and the first `count` that answered are kept, in rank order.
 * A candidate that failed after its retry flags the render as incomplete, unless `count` scans were found before it.
 */
async function scans(entries: Ranked[], state: RenderState, count = 3, quality: ImageQuality = 'low'): Promise<string[]> {
	const urls = entries.slice(0, count * 2).map(({ card }) => ogScan(card.image, quality));
	const responses = await Promise.all(urls.map(fetchScan));
	const kept: { response: Response; src: string }[] = [];
	const unused: (Promise<void> | undefined)[] = [];
	responses.forEach((response, index) => {
		if (response === undefined && kept.length < count) state.complete = false;
		if (response && kept.length < count) kept.push({ response, src: urls[index] });
		else unused.push(response?.body?.cancel());
	});

	const loaded = await Promise.all(kept.map(async ({ response, src }): Promise<ImageSource> => ({ cache: 'none', data: await response.arrayBuffer(), src })));
	await Promise.all(unused);
	state.sources.push(...loaded);
	return loaded.map(({ src }) => src);
}

const trioOrLogo = (urls: string[]) => (room: number): Node => urls.length ? trio(urls, room) : logoVisual();

/**
 * A card with no scan of its own: a gold-framed plate holding the illustration box of the borrowed `artImage` when it has one, cropped
 * like `CardPlateArt` (the box spans 8-92 % of the scan width and 11.5-47 % of its height, centered at 29.25 %, 33 % on a Trainer).
 */
function plate(card: Card, height: number): Node {
	const width = Math.round(height / CARD_RATIO);
	const window = { height: Math.round(height * 0.45), width: width - 44 };
	const scale = Math.max(window.width / 0.84, window.height / 0.488);
	const art = card.artImage
		? image({
			src: ogScan(card.artImage, 'high'),
			width: Math.round(scale),
			height: Math.round(scale * CARD_RATIO),
			style: { left: window.width / 2 - scale / 2, position: 'absolute', top: window.height / 2 - scale * CARD_RATIO * (card.supertype === 'Trainer' ? 0.33 : 0.2925) },
		})
		: image({ src: logoUrl, tw: 'h-[120px] w-[134px] opacity-50' });

	return container({
		tw: `flex shrink-0 flex-col items-center gap-5 border-[10px] border-[${color('gold-400')}] bg-[${color('gray-800')}] px-3 py-6`,
		style: { borderRadius: Math.round(height * 0.035), boxShadow: cardShadow, height, width },
		children: [
			text({ text: card.name, tw: 'w-full text-[30px] font-bold', style: { lineClamp: 1, textOverflow: 'ellipsis' } }),
			container({ tw: `relative flex items-center justify-center overflow-hidden rounded-[8px] bg-[${color('gray-900')}]`, style: window, children: [art] }),
			text({ text: card.artImage ? 'Art from another print' : 'No scan yet', tw: `text-[28px] text-[${color('gray-400')}]` }),
		],
	});
}

/** The card's name, its set with the logo, its flag, energy types and rarity, the price in gold, and the scan. A card and a price are one row read each, never the catalogue. */
async function cardImage(language: Language, code: string): Promise<Node | null> {
	const [card, priceData, sets] = await Promise.all([getCardDetails(language, code), getCardPrice(language, code), getSets(language)]);
	if (!card) return null;

	const set = sets.find(entry => entry.setId === card.setId);
	const price = ogPrice(cardPrice(priceData ?? undefined));
	const number = card.localId && !borrowsScan(card, language) ? formatCardNumber(card.localId, set?.printedTotal) : '';
	const types = card.types.split(',').map(type => type.trim()).filter(Boolean);
	const rarity = card.rarity ? raritySymbol(card.rarity, 30) : null;

	return canvas(700, [
		title(card.name, 620),
		fact(set?.logo ? [image({ src: absoluteImage(set.logo), tw: 'h-[50px] max-w-[140px] object-contain' })] : [icon(Library, 34)], card.setName),
		fact([flag(language), ...types.map(type => typeSymbol(type, 36)), ...(rarity ? [rarity] : [])], [card.rarity, number].filter(Boolean).join('  ·  ')),
		price ? hero(formatOgEuros(price), 620) : text({ text: 'No price yet', tw: `mt-2 text-[44px] font-semibold text-[${color('gray-400')}]` }),
	], card.image ? scan(ogScan(card.image, 'high'), 540) : plate(card, 540));
}

/** The set logo large, its name, its card count and year, its total value in gold, and its three most valuable cards. */
async function setImage(language: Language, setId: string, state: RenderState): Promise<Node | null> {
	const { cards, prices, sets } = await getCatalogue(language);
	const set = sets.find(entry => entry.setId === setId);
	if (!set) return null;

	const setCards = cards.filter(card => card.setId === setId);
	const value = ogPrice(setValue(setId, cards, prices));
	const year = set.releaseDate.getUTCFullYear();

	return canvas(480, [
		...(set.logo ? [image({ src: absoluteImage(set.logo), tw: 'h-[130px] max-w-[400px] object-contain object-left' })] : []),
		title(set.name, 410, 80),
		fact([flag(language)], [`${formatCount(setCardCount(set) || setCards.length)} cards`, year > 1995 ? String(year) : ''].filter(Boolean).join('  ·  ')),
		...(value ? [hero(formatOgEuros(value), 400)] : []),
	], trioOrLogo(await scans(ranked(setCards, prices, language), state)));
}

/** A failed read throws so the route answers 500 uncached, instead of drawing an empty image that would be stored for a day. */
function readFailed(what: string, error: unknown): never {
	throw new Error(`OG image: ${what} read failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
}

/**
 * Read with the anonymous client only, never with a visitor's session: row level security then shows public profiles and their rows alone,
 * so a cached image can never carry what only the owner sees. A private or unknown user gets the same image, which tells neither apart.
 */
async function userImage(kind: OgUserKind, username: string, state: RenderState): Promise<Node> {
	const { data: profile, error: profileError } = await getProfileByUsername(username, supabase);
	/** `.single()` answers `PGRST116` for an unknown user, who gets the private image; any other error is a failed read, which must not be cached as that image. */
	if (profileError && !(typeof profileError === 'object' && 'code' in profileError && profileError.code === 'PGRST116')) readFailed('profile', profileError);
	if (!profile?.is_public) {
		return canvas(560, [title(username, 480), fact([icon(Lock, 34)], `Private ${kind === 'wishlist' ? 'wishlist' : 'collection'}`)], logoVisual());
	}

	const name = profile.username;
	if (kind === 'wishlist') {
		const wishlist = await getOwnedCards(supabase, name, 'wishlist').catch((cause: unknown) => readFailed('wishlist', cause));
		const { totalValue } = ownedTotals(wishlist);
		const wanted = wishlist.cards.filter(({ image }) => image).map(card => ({ card, language: card.language, price: card.price ?? 0 })).sort((a, b) => b.price - a.price);
		return canvas(470, [
			title(name, 400),
			fact([icon(Heart, 34)], `${formatCount(wishlist.rows)} cards wanted`),
			...(totalValue ? [hero(formatEuros(totalValue), 390)] : []),
		], trioOrLogo(await scans(wanted, state)));
	}

	/** The profile image draws nothing from the wishlist, so it reads the collection alone. */
	const collection = await getOwnedCards(supabase, name, 'collection').catch((cause: unknown) => readFailed('collection', cause));
	const { top, totalValue, uniqueCards } = ownedTotals(collection);

	return canvas(470, [
		title(name, 400),
		fact([icon(Layers, 34)], uniqueCards ? `${formatCount(uniqueCards)} cards collected` : 'No cards yet'),
		...(totalValue ? [hero(formatEuros(totalValue), 390)] : []),
	], trioOrLogo(await scans(top.filter(({ image }) => image).map(card => ({ card, language: card.language, price: card.price })), state)));
}

/** Card.dle guess rows: tiles turning from red to green with the hint icons, the shape of a solved board without its card. */
function dleBoard(): Node {
	const hints: LucideIcon[] = [PawPrint, Paintbrush, Library, Gem, Layers, Sparkles, CircleEuro];
	const rows = ['xxoxxox', 'oxooxoo', 'ooooooo'];
	return container({
		tw: 'flex flex-col gap-3',
		children: rows.map(row => container({
			tw: 'flex gap-3',
			children: [...row].map((tile, position) => container({
				tw: 'flex h-[72px] w-[72px] items-center justify-center rounded-[10px]',
				style: { backgroundColor: tile === 'o' ? GREEN_600 : RED_600, boxShadow: '0 8px 20px rgb(0 0 0 / 0.5)' },
				children: [icon(hints[position], 36, '#ffffff')],
			})),
		})),
	});
}

/** One card with the price the game hides, as a gold tag over its bottom edge. */
function hiddenPrice(src: string): Node {
	return container({
		tw: 'relative flex flex-col items-center',
		children: [
			scan(src, 500),
			container({
				tw: `absolute bottom-[-18px] flex items-center rounded-full border-[6px] border-black bg-[${color('gold-400')}] px-10 py-2 text-[64px] font-bold text-black`,
				children: [text('??? €')],
			}),
		],
	});
}

async function pageImage(name: OgPage, state: RenderState): Promise<Node> {
	const language: Language = name === 'japan' ? 'ja' : name === 'france' ? 'fr' : 'en';
	const [cards, prices, sets] = await Promise.all([getCards(language), getPrices(language), getSets(language)]);
	const top = async (list: Card[]) => trioOrLogo(await scans(ranked(list, prices), state));
	const page = async (heading: string, tagline: string, line: Node, list: Card[] = cards) => canvas(510, [title(heading, 440), pitch(tagline), line], await top(list));

	switch (name) {
		case 'card.dle':
			return canvas(560, [title('Card.dle', 490), pitch('Guess the Pokémon card of the day from its hints.'), fact([icon(CalendarDays, 34)], 'A new card every day')], dleBoard());
		case 'guess-the-price': {
			const [first] = await scans(ranked(cards, prices), state, 1, 'high');
			return canvas(600, [title('Guess the Price', 530), pitch('How much is this card worth on Cardmarket?'), fact([icon(Flame, 34)], 'Streak combo up to x3')], first ? hiddenPrice(first) : logoVisual());
		}
		case 'home': {
			const total = (await Promise.all(LANGUAGES.map(countCards))).reduce((sum, count) => sum + count, 0);
			return page(SITE_NAME, 'Every card, its price, your collection.', fact(LANGUAGES.map(code => flag(code)), `${formatCount(total)} cards`));
		}
		case 'artists':
			return page('Pokémon TCG artists', 'Every illustrator and their most valuable cards.', fact([icon(Paintbrush, 34)], `${formatCount(new Set(cards.map(card => card.artist).filter(Boolean)).size)} artists`));
		case 'binder':
			return page('Binder builder', 'Lay out your binder page by page.', fact([icon(LayoutGrid, 34)], 'Export it as an image'));
		case 'pokemons':
			return page('Every Pokémon', 'And every card it appears on.', fact([icon(PawPrint, 34)], `${formatCount(POKEMONS_COUNT)} Pokémon`), cards.filter(card => card.supertype === 'Pokémon'));
		case 'sets':
			return page('Pokémon TCG sets', 'From Base Set to the latest release.', fact([icon(Library, 34)], `${formatCount(sets.length)} sets`));
		case 'trainers': {
			const trainers = cards.filter(card => card.supertype !== 'Pokémon');
			return page('Trainer & Energy cards', 'Every Trainer and Energy card with its prints.', fact([icon(Layers, 34)], `${formatCount(trainers.length)} cards`), trainers);
		}
		case 'users':
			return page('Pokémon TCG collectors', 'Browse the collections other players share.', fact([icon(Users, 34)], 'Collections and wishlists'));
		case 'cards-list':
		case 'france':
		case 'japan': {
			const { adjective } = CATALOGUES[language];
			return page(`${adjective} cards`, `Every ${adjective} Pokémon card and its price.`, fact([flag(language)], `${formatCount(cards.length)} cards in ${formatCount(sets.length)} sets`));
		}
	}
}

function layout(target: OgTarget, state: RenderState): Promise<Node | null> {
	switch (target.kind) {
		case 'card': return cardImage(target.language, target.code);
		case 'page': return pageImage(target.name, state);
		case 'set': return setImage(target.language, target.setId, state);
		default: return userImage(target.kind, target.username, state);
	}
}

export interface OgRender {
	/** False when a scan could not be fetched: the image is still served, but must not be cached. */
	complete: boolean;
	png: Uint8Array<ArrayBuffer>;
}

/** The 1200x630 PNG of `target`, or `null` when the card or set does not exist. */
export async function renderOgImage(target: OgTarget): Promise<OgRender | null> {
	const state: RenderState = { complete: true, sources: [] };
	const [node, noto] = await Promise.all([layout(target, state), notoFonts()]);
	if (!node) return null;

	/**
	 * The card hero and the logos the renderer fetches itself: a cached image would keep a blank card for a day, so a network error, a timeout
	 * or a 5xx is retried once, then flags the render as incomplete. A 4xx is a scan that does not exist, final.
	 */
	const fetchImage = (input: string, init?: RequestInit): Promise<Response> => {
		const attempt = async () => {
			const mirrored = input.startsWith(MIRRORED_PREFIX) ? await env.ASSETS?.fetch(input) : undefined;
			if (mirrored?.ok) return mirrored;
			await mirrored?.body?.cancel();
			const response = await fetch(input, { ...init, signal: AbortSignal.any([AbortSignal.timeout(IMAGE_TIMEOUT_MS), ...(init?.signal ? [init.signal] : [])]) });
			if (response.status >= 500) throw new Error(`${response.status} for ${input}`);
			return response;
		};
		return attempt().catch(attempt).catch((error: unknown) => {
			state.complete = false;
			throw error;
		});
	};

	const png = await render(node, {
		/** "from-font" keeps the renderer from fetching Twemoji images for characters like ☆, which Noto Sans JP draws. */
		emoji: 'from-font',
		fontFamilies: FONT_FAMILIES,
		fonts: [...CLASH_FONTS, ...noto],
		format: 'png',
		height: OG_HEIGHT,
		/**
		 * A scan or logo that fails to load is left out rather than failing the whole image. Scans are not kept decoded: takumi's 64 MiB
		 * default cache would fill on a crawler burst inside the 128 MB isolate that also holds the catalogue memos, so only the logo stays.
		 * The trio scans are in `sources`, matched by URL before any fetch.
		 */
		images: { cache: 'none', fetch: fetchImage, sources: [logoSource, ...state.sources], throwOnError: false },
		width: OG_WIDTH,
	});
	return { complete: state.complete, png };
}
