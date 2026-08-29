#!/usr/bin/env bun

import { select } from '@inquirer/prompts';
import { parseArgs } from 'node:util';
import { styleText } from 'node:util';
import { checkDatabase } from './src/scrapers/db-check.js';
import { fetchPokemons } from './src/scrapers/pokemon_scraper.js';
import { purgeExcludedSeries } from './src/scrapers/purge.js';
import { auditTcgdex } from './src/scrapers/tcgdex/audit.js';
import type { Language } from './src/scrapers/tcgdex/mappers.js';
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
	name: string;
	description: string;
	flags?: string;
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

const SUPABASE_TARGETS = ['all', 'types', 'pokemons', 'sets', 'jp-sets', 'cards', 'jp-cards', 'prices', 'jp-prices'] as const;
type SupabaseTarget = (typeof SUPABASE_TARGETS)[number];

const SUPABASE_UPLOADERS: Record<SupabaseTarget, string> = {
	'all': 'uploadAllData',
	'types': 'uploadTypes',
	'pokemons': 'uploadPokemons',
	'sets': 'uploadSets',
	'jp-sets': 'uploadJapaneseSets',
	'cards': 'uploadCards',
	'jp-cards': 'uploadJapaneseCards',
	'prices': 'uploadPrices',
	'jp-prices': 'uploadJapanesePrices',
};

const commands: Command[] = [
	{
		name: 'scrape',
		description: 'Fetch cards, prices and sets from TCGdex into src/assets/',
		flags: '--lang en,ja  --dry-run',
		run: async ({ dryRun, langs }) => {
			const results = await scrapeToFiles(langs, { write: !dryRun });
			heading('scrape');
			for (const [lang, result] of Object.entries(results)) {
				row(`${lang} cards`, `${result.cards.length} ${dim(`(${Object.keys(result.prices).length} priced, ${result.sets.length} sets)`)}`);
			}
			if (dryRun) console.log(dim('  dry run: src/assets/ untouched'));
			return Object.fromEntries(Object.entries(results).map(([lang, result]) => [lang, { cards: result.cards.length, prices: Object.keys(result.prices).length, sets: result.sets.length }]));
		},
	},
	{
		name: 'audit',
		description: 'Rebuild set-aliases.json / card-code-overrides.json and report what stops resolving',
		flags: '--dry-run',
		run: async ({ dryRun }) => {
			heading('audit');
			await auditTcgdex(!dryRun);
		},
	},
	{
		name: 'verify',
		description: 'Check the scraped JSON for card_code collisions and unresolved owned cards',
		flags: '--offline  --json',
		run: async ({ offline }) => {
			const report = await verifyFiles(!offline);
			heading('verify');
			for (const file of report.files) {
				const collisions = file.collisions === 0 ? styleText('green', 'no collisions') : styleText('red', `${file.collisions} collisions`);
				row(file.lang, `${file.cards} cards, ${file.sets} sets, ${file.priced} priced ${dim('|')} ${collisions}`);
			}
			if (!offline) {
				const status = report.missing.length === 0 ? styleText('green', 'all resolve') : styleText('yellow', `${report.missing.length} unresolved`);
				row('owned codes', `${report.owned} ${dim('|')} ${status}`);
				for (const code of report.missing) console.log(`    ${styleText('yellow', '·')} ${code}`);
			}
			return report;
		},
	},
	{
		name: 'check',
		description: 'Read-only sanity pass over the live Supabase catalogue',
		flags: '--json',
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
		name: 'purge',
		description: 'Delete every card, price and set of an excluded serie (Pokémon TCG Pocket) from Supabase',
		flags: '--dry-run  --json',
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
			return report;
		},
	},
	{
		name: 'pokemons',
		description: 'Fetch Pokédex names and descriptions from PokéAPI',
		run: async () => {
			await fetchPokemons();
		},
	},
	{
		name: 'supabase',
		description: `Upload scraped JSON to Supabase (${SUPABASE_TARGETS.join(', ')})`,
		flags: '<target>',
		run: async ({ target }) => {
			const chosen = (target ?? 'all') as SupabaseTarget;
			if (!SUPABASE_TARGETS.includes(chosen)) throw new Error(`Unknown supabase target "${chosen}". Expected one of: ${SUPABASE_TARGETS.join(', ')}`);
			heading(`supabase ${chosen}`);
			const uploader = await import('./src/scrapers/supabase_uploader.js') as Record<string, () => Promise<void>>;
			await uploader[SUPABASE_UPLOADERS[chosen]]();
		},
	},
	{
		name: 'all',
		description: 'scrape, then pokemons, then push everything to Supabase',
		flags: '--lang en,ja  --dry-run',
		run: async options => {
			for (const name of ['scrape', 'pokemons', 'supabase']) {
				const command = commands.find(entry => entry.name === name)!;
				await runCommand(command, { ...options, target: 'all' });
			}
		},
	},
];

function usage(): void {
	console.log(`
${bold('Pokémon data scraper')} ${dim('- TCGdex -> src/assets/ -> Supabase')}

  ${dim('$')} bun run scrapers ${accent('<command>')} [options]
  ${dim('$')} bun run scrapers               ${dim('# interactive menu')}

${bold('Commands')}
${commands.map(command => `  ${accent(command.name.padEnd(10))} ${command.description}${command.flags ? `\n  ${' '.repeat(10)} ${dim(command.flags)}` : ''}`).join('\n')}

${bold('Options')}
  ${accent('--lang <list>')}   languages to scrape, comma separated ${dim('(default: en,ja)')}
  ${accent('--dry-run')}       run everything but write no file
  ${accent('--offline')}       skip the Supabase round-trip in ${accent('verify')}
  ${accent('--json')}          print the raw report instead of the pretty one
  ${accent('--quiet, -q')}     only print the final summary
  ${accent('--help, -h')}      this screen
`);
}

async function runCommand(command: Command, options: Options): Promise<unknown> {
	const started = performance.now();
	const log = console.log;
	if (options.quiet) console.log = () => {};
	try {
		const result = await command.run(options);
		console.log = log;
		if (options.json && result !== undefined) console.log(JSON.stringify(result, null, '\t'));
		else console.log(dim(`  done in ${((performance.now() - started) / 1000).toFixed(1)}s`));
		return result;
	} catch (error) {
		console.log = log;
		console.error(`${styleText(['bgRed', 'white', 'bold'], ` ${command.name} failed `)} ${(error as Error).message}`);
		process.exitCode = 1;
	}
}

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			'dry-run': { type: 'boolean', default: false },
			'help': { type: 'boolean', short: 'h', default: false },
			'json': { type: 'boolean', default: false },
			'lang': { type: 'string', default: 'en,ja' },
			'offline': { type: 'boolean', default: false },
			'quiet': { type: 'boolean', short: 'q', default: false },
		},
	});

	if (values.help) return usage();

	const options: Options = {
		dryRun: values['dry-run'],
		json: values.json,
		langs: values.lang.split(',').map(lang => lang.trim()).filter(Boolean) as Language[],
		offline: values.offline,
		quiet: values.quiet,
		target: positionals[1],
	};

	const name = positionals[0] ?? await select({
		message: 'Choose a command:',
		choices: commands.map(command => ({ name: `${accent(command.name)} ${dim('-')} ${command.description}`, value: command.name })),
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
