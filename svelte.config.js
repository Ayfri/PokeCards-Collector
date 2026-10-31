import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	onwarn: (warning, handler) => {
		if (warning.code.startsWith('a11y_')) {
			return;
		}
		handler(warning);
	},
	kit: {
		adapter: adapter(),
		alias: {
			'@components': 'src/lib/components/*',
			'$helpers': 'src/lib/helpers/*',
			'$stores': 'src/lib/stores/*',
			'$scrapers': 'src/scrapers/*',
			'~': 'src/*',
		},
		typescript: {
			/** The generated tsconfig only includes `src/` and `vite.config.ts`, so `scraper-cli.ts` at the root is added to get type-checked. */
			config: (config) => {
				config.include.push('../scraper-cli.ts');
				return config;
			},
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
