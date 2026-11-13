import type {CardListRow, CatalogueManifest, PriceRow, PublishSummary, SetRow} from '#helpers/catalogue-snapshot.ts';
import {CATALOGUES, type Language, LANGUAGES} from '#helpers/catalogues.ts';
import type {Pokemon} from '#lib/types.js';

/**
 * The Discord report of a publish: what the new snapshot holds that the previous one did not, per language. Workers-safe, it only reads the bucket.
 * Each table is parsed and reduced to a Set before the next one is read, since the isolate has 128 MB.
 */

export interface LanguageFacts {
	artists: Set<string>;
	cards: Set<string>;
	/** The `card_code` of the cards whose `image` is not empty. */
	images: Set<string>;
	/** The `pokemon_id` of the cards that carry one. */
	pokemon: Set<number>;
	prices: Set<string>;
	/** `set_id` to name. */
	sets: Map<string, string>;
}

/** The first group holds the totals of the new snapshot, the second what the previous one did not have. */
export interface LanguageReport {
	artists: number;
	cards: number;
	pokemon: number;
	prices: number;
	sets: number;
	withImage: number;

	newArtists: string[];
	newCards: number;
	newImages: number;
	/** The Pokémon ids that no card of the previous snapshot carried. */
	newPokemon: number[];
	newPrices: number;
	/** The names of the sets whose id the previous snapshot did not hold. */
	newSets: string[];
}

export interface CatalogueReport {
	/** The names of the Pokémon in `languages[...].newPokemon`, read once. */
	pokemonNames: ReadonlyMap<number, string>;
	languages: Record<Language, LanguageReport>;
}

interface DiscordEmbed {
	color: number;
	description: string;
	fields: {inline: boolean; name: string; value: string}[];
	timestamp: string;
	title: string;
}

export interface DiscordPayload {
	embeds: DiscordEmbed[];
}

const FIELD_LIMIT = 1024;
/** A name list stops growing here, so one long list cannot push the others out of the field. */
const LIST_LIMIT = 300;
const GREEN = 5763719;

const FLAGS: Record<Language, string> = {en: '🇬🇧', fr: '🇫🇷', ja: '🇯🇵'};

/** `<:name:id>` is a custom emoji of the Discord server, which the webhook draws only in a channel of that server. */
const EMOJI = {
	artist: '<:pcc_artist:1570872886166819036>',
	card: '<:pcc_card:1570872888242995363>',
	image: '<:pcc_image:1570872891187400904>',
	logo: '<:pcc:1371431368663371836>',
	pokemon: '<:pcc_pokemon:1570872879510454332>',
	price: '<:pcc_price:1570872881397629028>',
	set: '<:pcc_set:1570872883830460457>',
};

/** A plain space, not `toLocaleString`: French puts a narrow no-break space there. */
const format = (value: number): string => String(value).replace(/\B(?=(\d{3})+$)/g, ' ');

/** A missing object throws: the manifest names it, so a hole means a collected or never written object. */
async function readTable<T>(bucket: R2Bucket, key: string): Promise<T[]> {
	const object = await bucket.get(key);
	if (!object) throw new Error(`${key} is not in the bucket`);
	return await new Response(object.body.pipeThrough(new DecompressionStream('gzip'))).json<T[]>();
}

export async function readFacts(bucket: R2Bucket, manifest: CatalogueManifest, lang: Language): Promise<LanguageFacts> {
	const {cards, prices, sets} = CATALOGUES[lang].tables;
	const facts: LanguageFacts = {artists: new Set(), cards: new Set(), images: new Set(), pokemon: new Set(), prices: new Set(), sets: new Map()};

	for (const {artist, card_code, image, pokemon_id} of await readTable<CardListRow>(bucket, manifest.objects[cards].key)) {
		facts.cards.add(card_code);
		if (image) facts.images.add(card_code);
		if (artist) facts.artists.add(artist);
		if (pokemon_id !== null) facts.pokemon.add(pokemon_id);
	}
	for (const {card_code} of await readTable<PriceRow>(bucket, manifest.objects[prices].key)) facts.prices.add(card_code);
	for (const {name, set_id} of await readTable<SetRow>(bucket, manifest.objects[sets].key)) if (set_id) facts.sets.set(set_id, name);

	return facts;
}

const missing = <T>(current: Iterable<T>, previous: ReadonlySet<T>): T[] => [...current].filter(value => !previous.has(value));

/** A new card that arrives with a scan counts as a new card and as a new image. */
export function diffFacts(current: LanguageFacts, previous: LanguageFacts): LanguageReport {
	return {
		artists: current.artists.size,
		cards: current.cards.size,
		newArtists: missing(current.artists, previous.artists),
		newCards: missing(current.cards, previous.cards).length,
		newImages: missing(current.images, previous.images).length,
		newPokemon: missing(current.pokemon, previous.pokemon).sort((a, b) => a - b),
		newPrices: missing(current.prices, previous.prices).length,
		newSets: missing(current.sets.keys(), new Set(previous.sets.keys())).map(id => current.sets.get(id) ?? id),
		pokemon: current.pokemon.size,
		prices: current.prices.size,
		sets: current.sets.size,
		withImage: current.images.size,
	};
}

/**
 * Null on the first publish: with no baseline, the whole catalogue would read as new.
 * The diff is snapshot against snapshot, not database triggers: the sync upserts every row daily and `dropSharedProducts` nulls ~460 images
 * and prices per run that the next upsert restores, so only what a publish put live is a real change.
 * The previous tables are read only for a language whose cards, prices or sets object moved (the keys are content hashes).
 */
export async function reportCatalogue(bucket: R2Bucket, manifest: CatalogueManifest, previous: CatalogueManifest | null): Promise<CatalogueReport | null> {
	if (!previous) return null;

	const reports: [Language, LanguageReport][] = [];
	for (const lang of LANGUAGES) {
		const {cards, prices, sets} = CATALOGUES[lang].tables;
		const current = await readFacts(bucket, manifest, lang);
		const moved = [cards, prices, sets].some(name => manifest.objects[name].key !== previous.objects[name].key);
		reports.push([lang, diffFacts(current, moved ? await readFacts(bucket, previous, lang) : current)]);
	}

	const languages = Object.fromEntries(reports) as Record<Language, LanguageReport>;
	const wanted = new Set(reports.flatMap(([, report]) => report.newPokemon));
	const pokemonNames = new Map<number, string>();
	if (wanted.size) for (const {id, name} of await readTable<Pokemon>(bucket, manifest.objects.pokemons.key)) if (wanted.has(id)) pokemonNames.set(id, name);

	return {languages, pokemonNames};
}

/** Discord markdown bold, which field values render. */
const bold = (value: number | string): string => `**${typeof value === 'number' ? format(value) : value}**`;

/** `**+1** card`, `**+1 204** cards`. */
const added = (count: number, singular: string, plural = `${singular}s`): string => `${bold(`+${format(count)}`)} ${count === 1 ? singular : plural}`;

/** `head: a, b`, the names shrinking to `, +M more` until at most `room` characters follow `head`. */
function listLine(head: string, names: string[], room: number): string {
	for (let shown = names.length; shown > 0; shown--) {
		const list = `: ${names.slice(0, shown).join(', ')}${shown < names.length ? `, +${format(names.length - shown)} more` : ''}`;
		if (list.length <= room) return head + list;
	}
	return head;
}

/** Only the lines of what changed, each with its total in the new snapshot. Null when nothing in the language changed. */
function fieldValue(report: LanguageReport, pokemonNames: ReadonlyMap<number, string>): string | null {
	const lines: string[] = [];
	if (report.newCards) lines.push(`${EMOJI.card} ${added(report.newCards, 'card')} (${bold(report.cards)} total)`);
	if (report.newImages) {
		const percent = (report.withImage / report.cards * 100).toFixed(1);
		lines.push(`${EMOJI.image} ${added(report.newImages, 'image')}, ${bold(report.withImage)}/${bold(report.cards)} (${bold(`${percent}%`)}) cards with an image`);
	}
	if (report.newPrices) lines.push(`${EMOJI.price} ${added(report.newPrices, 'price')} (${bold(report.prices)} total)`);

	const lists: [head: string, names: string[]][] = [
		[`${EMOJI.set} ${added(report.newSets.length, 'set')} (${bold(report.sets)} total)`, report.newSets],
		[`${EMOJI.artist} ${added(report.newArtists.length, 'artist')} (${bold(report.artists)} total)`, report.newArtists],
		[`${EMOJI.pokemon} ${added(report.newPokemon.length, 'Pokémon', 'Pokémon')} (${bold(report.pokemon)} total)`, report.newPokemon.map(id => pokemonNames.get(id) ?? `#${id}`)],
	];
	const changed = lists.filter(([, names]) => names.length);

	/** Every list line starts without names, then the names fill what is left of the field, each list up to `LIST_LIMIT`. */
	let room = FIELD_LIMIT - [...lines, ...changed.map(([head]) => head)].join('\n').length;
	for (const [head, names] of changed) {
		const line = listLine(head, names, Math.min(LIST_LIMIT, room));
		room -= line.length - head.length;
		lines.push(line);
	}

	return lines.length ? lines.join('\n') : null;
}

/** Null when nothing is new in any language. A language with nothing new gets no field. */
export function catalogueEmbed({languages, pokemonNames}: CatalogueReport, since: string): DiscordPayload | null {
	const fields = LANGUAGES.flatMap(lang => {
		const value = fieldValue(languages[lang], pokemonNames);
		return value ? [{inline: false, name: `${FLAGS[lang]} ${CATALOGUES[lang].adjective}`, value}] : [];
	});
	if (!fields.length) return null;

	return {
		embeds: [{
			color: GREEN,
			description: since,
			fields,
			timestamp: new Date().toISOString(),
			title: `${EMOJI.logo} Catalogue updated`,
		}],
	};
}

/** Throws on a non-2xx answer, so a Workflow step retries. */
export async function sendDiscord(url: string, payload: DiscordPayload): Promise<void> {
	const response = await fetch(url, {body: JSON.stringify(payload), headers: {'content-type': 'application/json'}, method: 'POST', signal: AbortSignal.timeout(15_000)});
	if (!response.ok) throw new Error(`Discord answered ${response.status}: ${await response.text()}`);
}

/** `2026-11-12T04:08:31.000Z` to `2026-11-12 04:08 UTC`. */
const formatUtc = (iso: string): string => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

/** True when a report was sent. No webhook, no baseline or nothing new is a silent no-op. */
export async function notifyCatalogue(bucket: R2Bucket, webhook: string | undefined, summary: PublishSummary): Promise<boolean> {
	if (!webhook || !summary.previous) return false;

	const report = await reportCatalogue(bucket, summary, summary.previous);
	const payload = report && catalogueEmbed(report, `since the publish of ${formatUtc(summary.previous.publishedAt)}`);
	if (!payload) return false;

	await sendDiscord(webhook, payload);
	return true;
}
