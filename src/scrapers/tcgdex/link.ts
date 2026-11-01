import * as fs from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {mapAll, withRetry, type TcgdexClient} from './client';
import {catalogueSets, excludedSetIds} from './excluded';
import {Http2Pool} from './http2-pool';
import {mapCard, UNKNOWN_POKEMON, type JpTwin, type Language} from './mappers';
import type {TcgdexCard, TcgdexSet} from './types';

/**
 * CLI only: it needs `node:zlib`, `Bun.Image` and the filesystem, and the Worker never imports it.
 * TCGdex gives Japanese cards their own sets and ids, which only collide with English ones by accident (`neo4-109` is Shining Mewtwo
 * in English and a Trainer in Japanese), and `variantId` is a constant per print kind, so a Japanese card is matched to its English
 * twin on traits no language changes: HP, types, attacks, weakness, retreat, illustrator and, for Trainers and Energy, the artwork.
 * Measured on the full catalogues, a unique match on all of them but the Pokédex number agrees with the Pokédex number on 99.5 % of the links.
 */

export const TWINS_FILE = 'src/scrapers/tcgdex/jp-twins.json';
/** The file name carries the hash algorithm: change `hashArt` and bump the version, or old hashes would be compared with new ones. */
const HASH_CACHE = '.cache/art-hashes-bun-v1.json';

/** On trusted pairs the same print is at most 67 bits apart (median 15) and another print of the same Pokémon at least 98. */
const SAME_PRINT = 80;
/** A Trainer or Energy link needs a clearly closer best candidate, since only the artwork tells them apart. */
const BEST_ART = 70;
/** Votes a Japanese set needs to map to an English set: this many, or a quarter of its votes. */
const MIN_VOTES = 3;
const MIN_VOTE_SHARE = 0.25;

export interface LinkOptions {
	/** `false` runs the whole pass without writing `jp-twins.json`. */
	write?: boolean;
}

export interface LinkReport {
	/** Links per method, then per category. */
	byMethod: Record<string, Record<string, number>>;
	/** Pokémon links the guards dropped: a Pokédex number that differs, and artwork of another print. */
	guardDrops: {art: number; dex: number};
	jaCards: number;
	linked: number;
	/** Japanese cards with no scan that now take the English scan of their twin. */
	scanlessGained: number;
}

interface Link {
	en: TcgdexCard;
	method: string;
}

/** 256-bit difference hash of the artwork, as eight 32-bit words. */
type ArtHash = Uint32Array;

const norm = (text?: string) => (text ?? '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]/g, '');
const categoryOf = (card: TcgdexCard) => card.category ?? 'Pokemon';
const hasAttacks = (card: TcgdexCard) => categoryOf(card) === 'Pokemon' && !!card.attacks?.length;
const attacksOf = (card: TcgdexCard) => (card.attacks ?? []).map(attack => `${[...(attack.cost ?? [])].sort().join('+')}:${String(attack.damage ?? '').replace(/[×x]/g, 'x')}`).join(';');

const mechanics = (card: TcgdexCard) => [
	card.category,
	card.hp,
	[...(card.types ?? [])].sort().join('+'),
	norm(card.stage),
	attacksOf(card),
	(card.weaknesses ?? []).map(weakness => weakness.type).join('+'),
	(card.resistances ?? []).map(resistance => resistance.type).join('+'),
	card.retreat,
	card.abilities?.length ?? 0,
].join('|');

const strongKey = (card: TcgdexCard) => hasAttacks(card) && card.illustrator ? `${mechanics(card)}|${norm(card.illustrator)}` : null;
const mechanicsKey = (card: TcgdexCard) => hasAttacks(card) ? mechanics(card) : null;

type Dexes = Map<TcgdexCard, number>;
type Key = (card: TcgdexCard, dexes: Dexes) => string | null;

/**
 * Pass 2 keys, strict to loose. There is no mechanics-only key: it had 28 Pokédex mismatches out of 183 links.
 * `mech+artist` is the pass 1 key, now only searched in the English sets the Japanese set maps to.
 */
const PASS_2_KEYS: [method: string, key: Key][] = [
	['mech+artist', strongKey],
	['dex+artist+hp', (card, dexes) => dexes.has(card) && card.illustrator ? `${dexes.get(card)}|${norm(card.illustrator)}|${card.hp}` : null],
	['dex+hp+attacks', (card, dexes) => dexes.has(card) ? `${dexes.get(card)}|${card.hp}|${attacksOf(card)}` : null],
];

function groupBy<T>(items: readonly T[], key: (item: T) => string | null): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const value = key(item);
		if (value !== null) groups.set(value, [...(groups.get(value) ?? []), item]);
	}
	return groups;
}

async function fetchCards(client: TcgdexClient, lang: Language): Promise<TcgdexCard[]> {
	const [listed, excluded] = await Promise.all([client.json<TcgdexSet[]>(`/v2/${lang}/sets`), excludedSetIds(client, lang)]);
	const sets = await mapAll(catalogueSets(listed ?? [], excluded), set => client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`));
	const ids = sets.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	const cards = await mapAll(ids, id => client.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`), `[${lang}] cards`);
	return cards.filter((card): card is TcgdexCard => card !== null).sort((a, b) => a.id.localeCompare(b.id));
}

/** The Pokédex number the catalogue stores for a Pokémon card, which corrects TCGdex's few wrong ids, left out when unknown. */
function dexesOf(lang: Language, cards: readonly TcgdexCard[]): Dexes {
	const dexes: Dexes = new Map();
	for (const card of cards) {
		const dex = categoryOf(card) === 'Pokemon' ? mapCard(lang, card).pokemonNumber : undefined;
		if (dex && dex !== UNKNOWN_POKEMON) dexes.set(card, dex);
	}
	return dexes;
}

/** Pokémon links from the pass 1 key, the set mapping its links vote for, and the pass 2 keys searched inside the mapped sets. */
function linkPokemon(ja: readonly TcgdexCard[], en: readonly TcgdexCard[], jaDexes: Dexes, enDexes: Dexes): {links: Map<string, Link>; mappedSets: Map<string, Set<string>>} {
	const links = new Map<string, Link>();
	const strong = groupBy(en, strongKey);
	for (const card of ja) {
		const hits = strong.get(strongKey(card) ?? '');
		if (hits?.length === 1) links.set(card.id, {en: hits[0], method: 'strong'});
	}

	/** Mechanics-only unique matches whose Pokédex number agrees vote too, so the old Japanese sets with no illustrator still get mapped. */
	const byMechanics = groupBy(en, mechanicsKey);
	const votes = new Map<string, Map<string, number>>();
	const vote = (japanese: TcgdexCard, english: TcgdexCard) => {
		const setVotes = votes.get(japanese.set?.id ?? '') ?? new Map<string, number>();
		votes.set(japanese.set?.id ?? '', setVotes);
		setVotes.set(english.set?.id ?? '', (setVotes.get(english.set?.id ?? '') ?? 0) + 1);
	};
	for (const card of ja) {
		const link = links.get(card.id);
		if (link) {
			vote(card, link.en);
			continue;
		}
		const hits = byMechanics.get(mechanicsKey(card) ?? '');
		if (hits?.length === 1 && jaDexes.has(card) && jaDexes.get(card) === enDexes.get(hits[0])) vote(card, hits[0]);
	}
	const mappedSets = new Map<string, Set<string>>();
	for (const [jaSet, setVotes] of votes) {
		const total = [...setVotes.values()].reduce((sum, count) => sum + count, 0);
		mappedSets.set(jaSet, new Set([...setVotes].filter(([, count]) => count >= MIN_VOTES || count / total >= MIN_VOTE_SHARE).map(([setId]) => setId)));
	}

	const enBySet = Map.groupBy(en, card => card.set?.id ?? '');
	const indexes = PASS_2_KEYS.map(([, key]) => new Map([...enBySet].map(([setId, cards]) => [setId, groupBy(cards, card => key(card, enDexes))] as const)));
	const claimed = new Set([...links.values()].map(link => link.en.id));
	for (const card of ja) {
		const sets = mappedSets.get(card.set?.id ?? '');
		if (links.has(card.id) || !sets?.size || categoryOf(card) !== 'Pokemon') continue;
		for (const [index, [method, key]] of PASS_2_KEYS.entries()) {
			const wanted = key(card, jaDexes);
			if (wanted === null) continue;
			const hits = [...sets].flatMap(setId => indexes[index].get(setId)?.get(wanted) ?? []);
			if (hits.length === 1) {
				links.set(card.id, {en: hits[0], method});
				break;
			}
			/** Several prints of one art in the mapped sets: the one no other Japanese card has claimed, when exactly one is left. */
			const free = hits.filter(hit => !claimed.has(hit.id));
			if (hits.length > 1 && free.length === 1) {
				links.set(card.id, {en: free[0], method: `${method}-free`});
				claimed.add(free[0].id);
				break;
			}
		}
	}
	return {links, mappedSets};
}

const popcount = (value: number) => {
	value -= (value >>> 1) & 0x55555555;
	value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
	return Math.imul((value + (value >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
};

const distance = (a: ArtHash, b: ArtHash) => a.reduce((bits, word, index) => bits + popcount(word ^ b[index]), 0);

/** The slice of `Bun.Image` the hash uses: the project has no Bun types, and Bun has no crop or raw-pixel output, hence the PNG round trip. */
interface BunImage {
	bytes(): Promise<Uint8Array>;
	png(): BunImage;
	resize(width: number, height: number): BunImage;
}

const BunImageClass = (globalThis as unknown as {Bun: {Image: new (bytes: Uint8Array) => BunImage}}).Bun.Image;

/** PNG color type -> samples per pixel, for the 8-bit gray, gray + alpha, RGB and RGBA files `Bun.Image` writes. */
const PNG_CHANNELS: Partial<Record<number, number>> = {0: 1, 2: 3, 4: 2, 6: 4};

/** Decodes an 8-bit PNG into luma values: `inflate`, then undo the five row filters (none, sub, up, average, Paeth). */
function pngLuma(png: Uint8Array): {height: number; luma: Float32Array; width: number} {
	const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
	const idat: Uint8Array[] = [];
	let width = 0;
	let height = 0;
	let channels: number | undefined;
	for (let offset = 8; offset < png.length;) {
		const length = view.getUint32(offset);
		const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
		const data = png.subarray(offset + 8, offset + 8 + length);
		if (type === 'IHDR') {
			width = view.getUint32(offset + 8);
			height = view.getUint32(offset + 12);
			channels = PNG_CHANNELS[data[9]];
			if (data[8] !== 8 || !channels) throw new Error(`Unsupported PNG: ${data[8]} bits, color type ${data[9]}`);
		} else if (type === 'IDAT') idat.push(data);
		offset += 12 + length;
	}
	if (!channels) throw new Error('PNG without IHDR');
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const pixels = new Uint8Array(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? pixels[y * stride + x - channels] : 0;
			const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
			const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
			const [pa, pb, pc] = [Math.abs(b - c), Math.abs(a - c), Math.abs(a + b - 2 * c)];
			const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			pixels[y * stride + x] = (line[x] + [0, a, b, (a + b) >> 1, paeth][filter]) & 255;
		}
	}
	const luma = new Float32Array(width * height);
	for (let index = 0; index < luma.length; index++) {
		const at = index * channels;
		luma[index] = channels >= 3 ? 0.299 * pixels[at] + 0.587 * pixels[at + 1] + 0.114 * pixels[at + 2] : pixels[at];
	}
	return {height, luma, width};
}

/**
 * Difference hash of the illustration box of a `low.webp` scan, so the scan's language and the card frame around the art do not count.
 * The box is roughly 8-92 % wide and 11-50 % high of the scan scaled to 85x117, box-averaged into 17x16 cells; a full art is art
 * everywhere, so the crop still lands on the picture. On trusted pairs the same print is at most 62 bits apart (median 14) and another
 * print of the same Pokémon at least 101 (median 127). Returns hex, `null` when the CDN has no such scan.
 */
async function hashArt(base: string): Promise<string | null> {
	const response = await fetch(`${base}/low.webp`);
	if (response.status >= 400 && response.status < 500) return null;
	if (!response.ok) throw new Error(`${response.status} on ${base}`);
	const {height, luma, width} = pngLuma(await new BunImageClass(new Uint8Array(await response.arrayBuffer())).resize(85, 117).png().bytes());
	const [left, top, boxWidth, boxHeight] = [width * 0.08, height * 0.11, width * 0.84, height * 0.39];
	const cell = (gx: number, gy: number) => {
		let sum = 0;
		let count = 0;
		for (let y = Math.floor(top + gy * boxHeight / 16); y < Math.floor(top + (gy + 1) * boxHeight / 16); y++) {
			for (let x = Math.floor(left + gx * boxWidth / 17); x < Math.floor(left + (gx + 1) * boxWidth / 17); x++, count++) sum += luma[y * width + x];
		}
		return sum / Math.max(count, 1);
	};
	const words = new Uint32Array(8);
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) if (cell(x, y) > cell(x + 1, y)) words[(y * 16 + x) >> 5] |= 1 << ((y * 16 + x) & 31);
	}
	return Array.from(words, word => word.toString(16).padStart(8, '0')).join('');
}

/** Artwork hashes by image base URL, persisted so a rerun does not refetch thousands of scans. A scan the CDN answers 4xx for is cached as `null`. */
class ArtHashes {
	private readonly parsed = new Map<string, ArtHash | null>();

	private constructor(private readonly cache: Record<string, string | null>) {}

	static async load(): Promise<ArtHashes> {
		return new ArtHashes(await fs.readFile(HASH_CACHE, 'utf8').then(text => JSON.parse(text) as Record<string, string | null>, () => ({})));
	}

	get(base: string | undefined): ArtHash | null {
		const hex = base ? this.cache[base] : null;
		if (!base || !hex) return null;
		let hash = this.parsed.get(base);
		if (!hash) {
			hash = Uint32Array.from({length: 8}, (_, index) => Number.parseInt(hex.slice(index * 8, index * 8 + 8), 16));
			this.parsed.set(base, hash);
		}
		return hash;
	}

	/** Hashes every scan not cached yet, with bounded concurrency. A scan that keeps failing stays uncached and counts as missing for this run. */
	async fill(bases: Iterable<string | undefined>, concurrency = 32): Promise<void> {
		const missing = [...new Set(bases)].filter((base): base is string => !!base && !(base in this.cache));
		console.log(`  art hashes: ${missing.length} scans to fetch`);
		let next = 0;
		let failed = 0;
		await Promise.all(Array.from({length: concurrency}, async () => {
			while (next < missing.length) {
				const base = missing[next++];
				try {
					this.cache[base] = await withRetry(() => hashArt(base), 3, 300);
				} catch {
					failed++;
				}
				if (next % 1000 === 0) console.log(`  art hashes: ${next}/${missing.length}`);
			}
		}));
		if (failed) console.warn(`  art hashes: ${failed} scans failed and count as missing`);
		await fs.mkdir('.cache', {recursive: true});
		await fs.writeFile(HASH_CACHE, JSON.stringify(this.cache));
	}
}

/**
 * Trainer and Energy cards have no stats to match, so a Japanese one is matched on its artwork against the English cards of the same
 * category in its mapped sets: the best must be within `BEST_ART` bits and no other candidate within `SAME_PRINT`.
 * Trainer type and illustrator inside the mapped sets alone were wrong on 12 % of the links, and effect-text digits were too noisy.
 */
function linkByArt(ja: readonly TcgdexCard[], en: readonly TcgdexCard[], mappedSets: Map<string, Set<string>>, hashes: ArtHashes): Map<string, Link> {
	const links = new Map<string, Link>();
	const scanned = en.filter(card => hashes.get(card.image) && categoryOf(card) !== 'Pokemon');
	const bySetAndCategory = Map.groupBy(scanned, card => `${card.set?.id}|${categoryOf(card)}`);
	for (const card of ja) {
		const art = hashes.get(card.image);
		if (!art || categoryOf(card) === 'Pokemon') continue;
		const candidates = [...mappedSets.get(card.set?.id ?? '') ?? []]
			.flatMap(setId => bySetAndCategory.get(`${setId}|${categoryOf(card)}`) ?? [])
			.map(candidate => ({candidate, bits: distance(art, hashes.get(candidate.image)!)}))
			.sort((a, b) => a.bits - b.bits);
		if (candidates[0] && candidates[0].bits <= BEST_ART && !(candidates[1] && candidates[1].bits <= SAME_PRINT)) links.set(card.id, {en: candidates[0].candidate, method: 'art'});
	}
	return links;
}

/** Writes one entry per line under a one-tab indent, since the default indent would spread each of the ~8000 links over four lines. */
async function writeTwins(twins: Record<string, JpTwin>): Promise<void> {
	const lines = Object.keys(twins).sort().map(id => `\t${JSON.stringify(id)}: ${JSON.stringify(twins[id])}`);
	await fs.writeFile(TWINS_FILE, lines.length ? `{\n${lines.join(',\n')}\n}\n` : '{}\n');
	console.log(`  wrote ${TWINS_FILE}`);
}

export async function linkTwins({write = true}: LinkOptions = {}): Promise<LinkReport> {
	const pool = new Http2Pool();
	const [ja, en] = await Promise.all([fetchCards(pool, 'ja'), fetchCards(pool, 'en')]).finally(() => pool.close());
	console.log(`[link] ${ja.length} Japanese and ${en.length} English cards`);
	const jaById = new Map(ja.map(card => [card.id, card]));

	const jaDexes = dexesOf('ja', ja);
	const enDexes = dexesOf('en', en);
	const {links: pokemonLinks, mappedSets} = linkPokemon(ja, en, jaDexes, enDexes);

	const hashes = await ArtHashes.load();
	const trainerOrEnergy = (card: TcgdexCard) => categoryOf(card) !== 'Pokemon';
	const mappedEnglish = new Set([...mappedSets.values()].flatMap(sets => [...sets]));
	await hashes.fill([
		...[...pokemonLinks].flatMap(([id, link]) => [jaById.get(id)?.image, link.en.image]),
		...ja.filter(trainerOrEnergy).map(card => card.image),
		...en.filter(card => trainerOrEnergy(card) && mappedEnglish.has(card.set?.id ?? '')).map(card => card.image),
	]);

	const guardDrops = {art: 0, dex: 0};
	const links = new Map<string, Link>();
	for (const [id, link] of pokemonLinks) {
		const card = jaById.get(id)!;
		const dexes = [jaDexes.get(card), enDexes.get(link.en)];
		if (dexes[0] && dexes[1] && dexes[0] !== dexes[1]) {
			guardDrops.dex++;
			continue;
		}
		const [a, b] = [hashes.get(card.image), hashes.get(link.en.image)];
		if (a && b && distance(a, b) > SAME_PRINT) {
			guardDrops.art++;
			continue;
		}
		links.set(id, link);
	}
	for (const [id, link] of linkByArt(ja, en, mappedSets, hashes)) links.set(id, link);

	const twins = Object.fromEntries([...links].map(([id, link]) => [id, {en: link.en.id, method: link.method}]));
	const byMethod: Record<string, Record<string, number>> = {};
	for (const [id, link] of [...links].sort(([a], [b]) => a.localeCompare(b))) {
		const methodCounts = byMethod[link.method] ??= {};
		const category = categoryOf(jaById.get(id)!);
		methodCounts[category] = (methodCounts[category] ?? 0) + 1;
	}
	if (write) await writeTwins(twins);
	return {
		byMethod,
		guardDrops,
		jaCards: ja.length,
		linked: links.size,
		scanlessGained: [...links.keys()].filter(id => !jaById.get(id)!.image).length,
	};
}
