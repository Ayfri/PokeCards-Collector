import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	onwarn: (warning, handler) => {
		// Ignore a11y warnings
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
			// The generated include list only covers src/ and vite.config.ts, so the root scraper CLI would go unchecked.
			config: (config) => {
				config.include.push('../scraper-cli.ts');
				return config;
			},
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
