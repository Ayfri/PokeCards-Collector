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
	},
	preprocess: vitePreprocess(),
};

export default config;
