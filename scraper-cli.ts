#!/usr/bin/env bun

import { select } from '@inquirer/prompts';
import { readFile } from 'node:fs/promises';
import { parseArgs, styleText } from 'node:util';
import { CATALOGUES, type Language, LANGUAGES } from './src/lib/helpers/catalogues.js';
import type { PublishSummary } from './src/lib/helpers/catalogue-snapshot.js';
import { FILES, POKEMONS, publishRemotely, TYPES } from './src/scrapers/cli-config.js';
import { checkDatabase } from './src/scrapers/db-check.js';
import { fetchPokemons } from './src/scrapers/pokemon-scraper.js';
import { purgeExcludedSeries } from './src/scrapers/purge.js';
import { auditTcgdex } from './src/scrapers/tcgdex/audit.js';
import { verifyFiles } from './src/scrapers/tcgdex/verify.js';
import { scrapeToFiles } from './src/scrapers/tcgdex/write.js';

interface Options {
	dryRun: boolean;
	json: boolean;
	langs: Language[];
	offline: boolean;
	quiet: boolean;
	target?: string;
}

interface Command {
	description: string;
	flags?: string;
	name: string;
	run: (options: Options) => Promise<unknown>;
}

const dim = (text: string) => styleText('gray', text);
const bold = (text: string) => styleText('bold', text);
const accent = (text: string) => styleText('cyan', text);

function heading(text: string): void {
	console.log(`\n${styleText(['bgCyan', 'black', 'bold'], ` ${text} `)}`);
}

function row(label: string, value: string | number): void {
	console.log(`  ${dim(`${label.padEnd(18)}`)} ${value}`);
}

function reportPublish(summary: PublishSummary): PublishSummary {
	heading('publish');
	for (const [name, { bytes, key, rows }] of Object.entries(summary.objects)) {
		row(name, `${rows} rows, ${(bytes / 1024).toFixed(0)} kB ${dim(key)}`);
	}
	row('written', summary.written.length ? summary.written.join(', ') : dim('none, every object was already there'));
	row('removed', summary.removed);
	return summary;
}

const SUPABASE_TARGETS = ['all', 'types', 'pokemons', 'sets', 'jp-sets', 'fr-sets', 'cards', 'jp-cards', 'fr-cards', 'prices', 'jp-prices', 'fr-prices'] as const;
type SupabaseTarget = (typeof SUPABASE_TARGETS)[number];

/** In upload order like `SUPABASE_TARGETS`, not alphabetical: the sets go before the cards, and the cards before the prices. */
const SUPABASE_UPLOADERS: Record<SupabaseTarget, readonly [uploader: string, language?: Language]> = {
	'all': ['uploadAllData'],
	'types': ['uploadTypes'],
	'pokemons': ['uploadPokemons'],
	'sets': ['uploadSets', 'en'],
	'jp-sets': ['uploadSets', 'ja'],
	'fr-sets': ['uploadSets', 'fr'],
	'cards': ['uploadCards', 'en'],
	'jp-cards': ['uploadCards', 'ja'],
	'fr-cards': ['uploadCards', 'fr'],
	'prices': ['uploadPrices', 'en'],
	'jp-prices': ['uploadPrices', 'ja'],
	'fr-prices': ['uploadPrices', 'fr'],
};

/**
 * The table each target writes and the staged file it reads, for `supabase --dry-run`: that path never loads the uploader, which builds its
 * Supabase client when imported, so a dry run needs no credentials. In upload order, which is the order the dry run prints.
 */
const SUPABASE_STAGED: Record<Exclude<SupabaseTarget, 'all'>, readonly [table: string, file: string]> = {
	'types': ['types', TYPES],
	'pokemons': ['pokemons', POKEMONS],
	'sets': [CATALOGUES.en.tables.sets, FILES.en.sets],
	'jp-sets': [CATALOGUES.ja.tables.sets, FILES.ja.sets],
	'fr-sets': [CATALOGUES.fr.tables.sets, FILES.fr.sets],
	'cards': [CATALOGUES.en.tables.cards, FILES.en.cards],
	'jp-cards': [CATALOGUES.ja.tables.cards, FILES.ja.cards],
	'fr-cards': [CATALOGUES.fr.tables.cards, FILES.fr.cards],
	'prices': [CATALOGUES.en.tables.prices, FILES.en.prices],
	'jp-prices': [CATALOGUES.ja.tables.prices, FILES.ja.prices],
	'fr-prices': [CATALOGUES.fr.tables.prices, FILES.fr.prices],
};

const commands: Command[] = [
	{
		description: 'Fetch cards, prices and sets from TCGdex into src/assets/',
		flags: `--lang ${LANGUAGES.join(',')}  --dry-run  --json`,
		name: 'scrape',
		run: async ({ dryRun, langs }) => {
			const results = await scrapeToFiles(langs, !dryRun);
			heading('scrape');
			for (const [lang, result] of Object.entries(results)) {
				row(`${lang} cards`, `${result.cards.length} ${dim(`(${Object.keys(result.prices).length} priced, ${result.sets.length} sets)`)}`);
			}
			if (dryRun) console.log(dim('  dry run: src/assets/ untouched'));
			return Object.fromEntries(Object.entries(results).map(([lang, result]) => [lang, { cards: result.cards.length, prices: Object.keys(result.prices).length, sets: result.sets.length }]));
		},
	},
	{
		description: 'Rebuild set-aliases.json / set-names.json / card-code-overrides.json and report what stops resolving',
		flags: '--dry-run',
		name: 'audit',
		run: async ({ dryRun }) => {
			heading('audit');
			await auditTcgdex(!dryRun);
		},
	},
	{
		description: 'Match every Japanese card and set to its English twin and write jp-twins.json / jp-set-twins.json',
		flags: '--dry-run  --json',
		name: 'link',
		run: async ({ dryRun }) => {
			const { linkTwins } = await import('./src/scrapers/tcgdex/link.js');
			const report = await linkTwins(!dryRun);
			heading('link');
			row('linked', `${report.linked} of ${report.jaCards} Japanese cards`);
			for (const [method, categories] of Object.entries(report.byMethod).sort()) {
				row(method, Object.entries(categories).map(([category, count]) => `${count} ${category}`).join(', '));
			}
			row('guard drops', `${report.guardDrops.dex} on the Pokédex number, ${report.guardDrops.art} on the artwork`);
			row('gained a scan', `${report.scanlessGained} Japanese cards with no scan take their twin's`);
			row('unhashed', `${report.unhashedCandidates} English candidates skipped by the artwork comparison for lack of a hash`);
			if (dryRun) console.log(dim('  dry run: jp-twins.json untouched'));
			return report;
		},
	},
	{
		description: 'Check the scraped JSON for card_code collisions and unresolved owned cards',
		flags: '--offline  --json',
		name: 'verify',
		run: async ({ offline }) => {
			const report = await verifyFiles(!offline);
			heading('verify');
			for (const file of report.files) {
				const collisions = file.collisions === 0 ? styleText('green', 'no collisions') : styleText('red', `${file.collisions} collisions`);
				row(file.lang, `${file.cards} cards, ${file.sets} sets, ${file.priced} priced ${dim('|')} ${collisions}`);
				if (file.unknownValues.length) row(`${file.lang} unknown`, styleText('red', file.unknownValues.join(', ')));
				if (file.missingTwins.length) row(`${file.lang} bad twins`, styleText('red', `${file.missingTwins.length}: ${file.missingTwins.slice(0, 5).join(', ')}`));
				if (file.slugCollisions.length) row(`${file.lang} slug collisions`, styleText('red', `${file.slugCollisions.length}: ${file.slugCollisions.slice(0, 5).join(', ')}`));
				if (file.sharedSetNames.length) row(`${file.lang} shared names`, styleText('yellow', file.sharedSetNames.join(', ')));
			}
			row('cross collisions', report.crossCollisions.length === 0 ? styleText('green', 'none') : styleText('red', `${report.crossCollisions.length}: ${report.crossCollisions.slice(0, 10).join(', ')}`));
			/** Two cards or sets sharing a slug share a public URL, so it fails the run; the 19 cross-catalogue codes are a known warning. */
			if (report.files.some(file => file.slugCollisions.length)) process.exitCode = 1;
			if (!offline) {
				const status = report.missing.length === 0 ? styleText('green', 'all resolve') : styleText('yellow', `${report.missing.length} unresolved`);
				row('owned codes', `${report.owned} ${dim('|')} ${status}`);
				for (const code of report.missing) console.log(`    ${styleText('yellow', '·')} ${code}`);
			}
			return report;
		},
	},
	{
		description: 'Read-only sanity pass over the live Supabase catalogue',
		flags: '--json',
		name: 'check',
		run: async () => {
			const report = await checkDatabase();
			heading('check');
			for (const check of report.checks) {
				if (check.severity === 'info' && check.count === 0) continue;
				const colour = check.count === 0 ? 'green' : check.severity === 'error' ? 'red' : check.severity === 'warn' ? 'yellow' : 'cyan';
				row(check.name.padEnd(44), styleText(colour, String(check.count)));
				for (const value of check.sample) console.log(`      ${dim(value)}`);
			}
			row('result', report.errors === 0 ? styleText('green', `no error, ${report.warnings} warnings`) : styleText('red', `${report.errors} failing checks, ${report.warnings} warnings`));
			if (report.errors > 0) process.exitCode = 1;
			return report;
		},
	},
	{
		description: 'Delete every card, price and set of an excluded serie (Pokémon TCG Pocket) from Supabase',
		flags: '--dry-run  --json',
		name: 'purge',
		run: async ({ dryRun }) => {
			const report = await purgeExcludedSeries(dryRun);
			heading(dryRun ? 'purge (dry run)' : 'purge');
			for (const lang of report.langs) {
				row(`${lang.lang} sets`, lang.sets.length ? `${lang.sets.length} ${dim(lang.sets.join(', '))}` : dim('none'));
				row(`${lang.lang} cards`, `${lang.cards} ${dim(dryRun ? 'would be deleted' : 'deleted')}`);
				row(`${lang.lang} prices`, `${lang.prices} ${dim(dryRun ? 'would be deleted' : 'deleted')}`);
				if (lang.orphanedOwned.length) {
					row(`${lang.lang} owned`, styleText('yellow', `${lang.orphanedOwned.length} collection/wishlist rows keep pointing at a purged card`));
					for (const code of lang.orphanedOwned.slice(0, 10)) console.log(`      ${dim(code)}`);
				}
			}
			if (!dryRun && report.langs.some(lang => lang.cards || lang.sets.length)) reportPublish(await publishRemotely());
			return report;
		},
	},
	{
		description: 'Fetch Pokédex names and descriptions from PokéAPI',
		flags: '--dry-run',
		name: 'pokemons',
		run: async ({ dryRun }) => {
			await fetchPokemons(!dryRun);
			if (dryRun) console.log(dim('  dry run: pokemons-full.json untouched'));
		},
	},
	{
		description: `Upload scraped JSON to Supabase (${SUPABASE_TARGETS.join(', ')}), then publish the catalogue`,
		flags: '<target>  --dry-run  --json',
		name: 'supabase',
		run: async ({ dryRun, target }) => {
			const chosen = (target ?? 'all') as SupabaseTarget;
			if (!SUPABASE_TARGETS.includes(chosen)) throw new Error(`Unknown supabase target "${chosen}". Expected one of: ${SUPABASE_TARGETS.join(', ')}`);
			heading(dryRun ? `supabase ${chosen} (dry run)` : `supabase ${chosen}`);
			if (dryRun) {
				for (const [name, [table, file]] of Object.entries(SUPABASE_STAGED)) {
					if (chosen !== 'all' && name !== chosen) continue;
					const staged = JSON.parse(await readFile(file, 'utf8')) as unknown[] | Record<string, unknown>;
					row(table, `${Array.isArray(staged) ? staged.length : Object.keys(staged).length} rows ${dim(`from ${file}`)}`);
				}
				console.log(dim('  dry run: Supabase untouched'));
				return;
			}
			const uploaders = await import('./src/scrapers/supabase-uploader.js') as Record<string, (language?: Language) => Promise<void>>;
			const [uploader, language] = SUPABASE_UPLOADERS[chosen];

			/** The publish runs after a failed upload too, since the tables it already wrote have changed. The upload error is the one that ends the command. */
			let summary: PublishSummary | undefined;
			let uploaded = false;
			try {
				await uploaders[uploader](language);
				uploaded = true;
			} finally {
				try {
					summary = reportPublish(await publishRemotely());
				} catch (error) {
					if (uploaded) throw error;
					console.error(`${styleText('red', 'publish failed after the failed upload:')} ${(error as Error).message}`);
				}
			}
			return summary;
		},
	},
	{
		description: 'Publish the Supabase catalogue as the R2 snapshots the site reads, through the scraper Worker',
		flags: '--dry-run  --json',
		name: 'publish',
		run: async ({ dryRun }) => {
			if (dryRun) {
				heading('publish (dry run)');
				console.log(dim('  dry run: nothing published'));
				return;
			}
			return reportPublish(await publishRemotely());
		},
	},
	{
		description: 'scrape, then pokemons, then push everything to Supabase and publish it',
		flags: `--lang ${LANGUAGES.join(',')}  --dry-run`,
		name: 'all',
		run: async options => {
			for (const name of ['scrape', 'pokemons', 'supabase']) {
				const command = commands.find(entry => entry.name === name)!;
				await runCommand(command, { ...options, target: 'all' });
				/** A failed step ends the run: uploading after a failed scrape would push half-refreshed files and delete the sets missing from them. */
				if (process.exitCode) return;
			}
		},
	},
];

function usage(): void {
	console.log(`
${bold('Pokémon data scraper')} ${dim('- TCGdex -> src/assets/ -> Supabase -> R2')}

  ${dim('$')} bun run scrapers ${accent('<command>')} [options]
  ${dim('$')} bun run scrapers               ${dim('# interactive menu')}

${bold('Commands')}
${commands.map(command => `  ${accent(command.name.padEnd(10))} ${command.description}${command.flags ? `\n  ${' '.repeat(10)} ${dim(command.flags)}` : ''}`).join('\n')}

${bold('Options')}
  ${accent('--lang <list>')}   languages to scrape, comma separated ${dim(`(default: ${LANGUAGES.join(',')})`)}
  ${accent('--dry-run')}       run everything but write nothing: no file, no Supabase row, no publish
  ${accent('--offline')}       skip the Supabase round-trip in ${accent('verify')}
  ${accent('--json')}          print the raw report instead of the pretty one
  ${accent('--quiet, -q')}     only print the final summary
  ${accent('--help, -h')}      this screen
`);
}

async function runCommand(command: Command, options: Options): Promise<void> {
	const started = performance.now();
	const log = console.log;
	if (options.quiet) console.log = () => {};
	try {
		const result = await command.run(options);
		console.log = log;
		if (options.json && result !== undefined) console.log(JSON.stringify(result, null, '\t'));
		else console.log(dim(`  done in ${((performance.now() - started) / 1000).toFixed(1)}s`));
	} catch (error) {
		console.log = log;
		console.error(`${styleText(['bgRed', 'white', 'bold'], ` ${command.name} failed `)} ${(error as Error).message}`);
		process.exitCode = 1;
	}
}

async function main(): Promise<void> {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: {
			'dry-run': { default: false, type: 'boolean' },
			'help': { default: false, short: 'h', type: 'boolean' },
			'json': { default: false, type: 'boolean' },
			'lang': { default: LANGUAGES.join(','), type: 'string' },
			'offline': { default: false, type: 'boolean' },
			'quiet': { default: false, short: 'q', type: 'boolean' },
		},
	});

	if (values.help) return usage();

	const langs = values.lang.split(',').map(lang => lang.trim()).filter(Boolean);
	const unknown = langs.find(lang => !LANGUAGES.includes(lang as Language));
	if (unknown) throw new Error(`Unknown language "${unknown}". Expected one of: ${LANGUAGES.join(', ')}`);

	const options: Options = {
		dryRun: values['dry-run'],
		json: values.json,
		langs: langs as Language[],
		offline: values.offline,
		quiet: values.quiet,
		target: positionals[1],
	};

	const name = positionals[0] ?? await select({
		choices: commands.map(command => ({ name: `${accent(command.name)} ${dim('-')} ${command.description}`, value: command.name })),
		message: 'Choose a command:',
	});

	const command = commands.find(entry => entry.name === name);
	if (!command) {
		console.error(styleText('red', `Unknown command "${name}"`));
		usage();
		process.exitCode = 1;
		return;
	}

	await runCommand(command, options);
}

main().catch(error => {
	console.error(styleText('red', 'Fatal error:'), error);
	process.exit(1);
});
