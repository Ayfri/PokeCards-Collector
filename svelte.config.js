import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		dev: process.env.NODE_ENV === 'development',
		immutable: true,
	},
	kit: {
		adapter: adapter({
			// Configure the adapter to exclude images from route handling
			routes: {
				exclude: [
					// Exclude static images - significantly reduces the number of routes
					'**/images/cards/**'
				]
			}
		}),
		alias: {
			'@components': 'src/lib/components/*',
			'$helpers': 'src/lib/helpers/*',
			'$stores': 'src/lib/stores/*',
			'$scrappers': 'src/scrappers/*',
			'~': 'src/*',
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
